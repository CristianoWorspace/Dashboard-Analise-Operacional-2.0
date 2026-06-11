// api/users.ts — Vercel Serverless
// Substitua o arquivo atual por este.
// A planilha passa a ser a fonte de verdade; o fallback só mantém o admin master quando a aba USUARIOS ainda não estiver disponível.

type AppUser = {
  name: string;
  username: string;
  password?: string;
  email: string;
  role: string;
};

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

function normalizeUser(raw: any): AppUser | null {
  if (!raw || typeof raw !== "object") return null;

  const name = String(raw.name ?? raw.Nome ?? raw.nome ?? "").trim();
  const username = String(raw.username ?? raw.USUARIO ?? raw.usuario ?? raw.user ?? "").trim().toLowerCase();
  const password = String(raw.password ?? raw.SENHA ?? raw.senha ?? "").trim();
  const email = String(raw.email ?? raw["E-MAIL"] ?? raw.Email ?? raw.email_address ?? "").trim();
  const role = String(raw.role ?? raw["Nivel de Acesso"] ?? raw["Nível de Acesso"] ?? raw.nivel ?? "Colaborador").trim();

  if (!name || !username || !email || !role) return null;

  return { name, username, password, email, role };
}

function assertUserPayload(body: any) {
  const user = normalizeUser(body);
  if (!user || !user.password) {
    throw new Error("Todos os campos são obrigatórios: nome, usuário, senha, e-mail e nível de acesso.");
  }
  return user;
}

async function callSheet(action: string, payload?: Record<string, any>) {
  const url = `${APPS_SCRIPT_URL}?action=${encodeURIComponent(action)}`;
  const response = await fetch(url, {
    method: payload ? "POST" : "GET",
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify({ action, ...payload }) : undefined,
    cache: "no-store"
  });

  const text = await response.text();
  let result: any;

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`Apps Script não retornou JSON válido para ${action}. Resposta inicial: ${text.slice(0, 250)}`);
  }

  if (!response.ok) {
    throw new Error(result?.message || `Apps Script respondeu HTTP ${response.status}.`);
  }

  return result;
}

async function getUsersFromSheet() {
  const result = await callSheet("getUsers");
  const rawUsers = Array.isArray(result.users) ? result.users : Array.isArray(result.data) ? result.data : [];
  const users = rawUsers.map(normalizeUser).filter(Boolean) as AppUser[];

  // Se o Apps Script antigo estiver ignorando action=getUsers, ele devolverá dados da aba Dados.
  // Nesse caso, não devemos fingir que funcionou.
  if (users.length === 0 && rawUsers.length > 0) {
    throw new Error(
      "O Apps Script respondeu dados, mas não usuários. Provavelmente o doGet/doPost ainda não trata action=getUsers nem a aba USUARIOS."
    );
  }

  return users;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === "GET") {
      const users = await getUsersFromSheet();
      // Não exponha senha para a interface administrativa.
      return res.status(200).json({
        success: true,
        users: users.map(({ password, ...safe }) => safe)
      });
    }

    if (req.method === "POST") {
      const newUser = assertUserPayload(req.body);
      const result = await callSheet("createUser", newUser);

      if (result.success === false) {
        return res.status(400).json({ success: false, message: result.message || "A planilha recusou a criação do usuário." });
      }

      return res.status(200).json({ success: true, user: result.user || { ...newUser, password: undefined } });
    }

    if (req.method === "PUT") {
      const username = String(req.query.username || req.body.username || "").trim().toLowerCase();
      if (!username) {
        return res.status(400).json({ success: false, message: "Usuário não informado para atualização." });
      }

      const payload = {
        username,
        name: req.body.name,
        password: req.body.password,
        email: req.body.email,
        role: req.body.role
      };

      const result = await callSheet("updateUser", payload);
      if (result.success === false) {
        return res.status(400).json({ success: false, message: result.message || "A planilha recusou a atualização do usuário." });
      }

      return res.status(200).json({ success: true, user: result.user });
    }

    if (req.method === "DELETE") {
      const username = String(req.query.username || "").trim().toLowerCase();
      if (!username) {
        return res.status(400).json({ success: false, message: "Usuário não informado para exclusão." });
      }


      const result = await callSheet("deleteUser", { username });
      if (result.success === false) {
        return res.status(400).json({ success: false, message: result.message || "A planilha recusou a exclusão do usuário." });
      }

      return res.status(200).json({ success: true, message: result.message || "Usuário removido com sucesso." });
    }

    return res.status(405).json({ success: false, message: "Método não permitido." });
  } catch (e: any) {
    console.error("[api/users]", e);
    return res.status(500).json({
      success: false,
      message: e?.message || "Erro ao comunicar com a planilha de usuários. Verifique o Apps Script."
      error: String(e)
    });
  }
}
