// api/users.ts
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

  const name     = String(raw.nome     ?? raw.name     ?? "").trim();
  const username = String(raw.usuario  ?? raw.username ?? "").trim().toLowerCase();
  const password = String(raw.senha    ?? raw.password ?? "").trim();
  const email    = String(raw.email    ?? raw["e-mail"] ?? "").trim();
  const role     = String(raw.nivel_de_acesso ?? raw.role ?? "Colaborador").trim();

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
    throw new Error(`Apps Script não retornou JSON válido para ${action}. Resposta: ${text.slice(0, 250)}`);
  }

  if (!response.ok) {
    throw new Error(result?.message || `Apps Script respondeu HTTP ${response.status}.`);
  }

  return result;
}

async function getUsersFromSheet() {
  const result = await callSheet("getUsers");
  const rawUsers = Array.isArray(result.users)
    ? result.users
    : Array.isArray(result.data)
    ? result.data
    : [];

  const users = rawUsers.map(normalizeUser).filter(Boolean) as AppUser[];

  if (users.length === 0 && rawUsers.length > 0) {
    throw new Error("Usuários recebidos do Apps Script não puderam ser normalizados. Verifique os campos retornados.");
  }

  return users;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === "GET") {
      const users = await getUsersFromSheet();
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
        name:     req.body.name,
        password: req.body.password,
        email:    req.body.email,
        role:     req.body.role
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
      message: e?.message || "Erro ao comunicar com a planilha de usuários.",
      error: String(e)
    });
  }
}
