// api/login.ts — Vercel Serverless
// Substitua o arquivo atual por este.

type AppUser = {
  name: string;
  username: string;
  password: string;
  email: string;
  role: string;
};

const MASTER_USER: AppUser = {
  name: "Cristiano Rafael Kuhn",
  username: "cristiano.kuhn",
  password: "9784Pqa@",
  email: "cristianokuhn7@gmail.com",
  role: "Admin"
};

const SHEET_URL =
  process.env.GOOGLE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbyt9oKLdVTEoBlFW9NThj7usEkYYzRbDJZOY_DY9cnnrxT-L-ZrWJj8UuSuBf4BgTBKdQ/exec";

function normalizeUser(raw: any): AppUser | null {
  if (!raw || typeof raw !== "object") return null;

  const name = String(raw.name ?? raw.Nome ?? raw.nome ?? "").trim();
  const username = String(raw.username ?? raw.USUARIO ?? raw.usuario ?? raw.user ?? "").trim().toLowerCase();
  const password = String(raw.password ?? raw.SENHA ?? raw.senha ?? "").trim();
  const email = String(raw.email ?? raw["E-MAIL"] ?? raw.Email ?? raw.email_address ?? "").trim();
  const role = String(raw.role ?? raw["Nivel de Acesso"] ?? raw["Nível de Acesso"] ?? raw.nivel ?? "Colaborador").trim();

  if (!name || !username || !password || !email || !role) return null;
  return { name, username, password, email, role };
}

async function getUsersFromSheet(): Promise<AppUser[]> {
  const response = await fetch(`${SHEET_URL}?action=getUsers`, { cache: "no-store" });
  const text = await response.text();

  let result: any;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`Apps Script não retornou JSON válido. Resposta inicial: ${text.slice(0, 250)}`);
  }

  const rawUsers = Array.isArray(result.users) ? result.users : Array.isArray(result.data) ? result.data : [];
  const users = rawUsers.map(normalizeUser).filter(Boolean) as AppUser[];

  if (users.length === 0 && rawUsers.length > 0) {
    throw new Error("O Apps Script respondeu dados da agenda, mas não usuários. Atualize o Apps Script para tratar action=getUsers.");
  }

  return users.length > 0 ? users : [MASTER_USER];
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Método não permitido." });
  }

  const username = String(req.body?.username || "").trim().toLowerCase();
  const password = String(req.body?.password || "").trim();

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Informe usuário e senha." });
  }

  try {
    const users = await getUsersFromSheet();
    const found = users.find((u) => u.username === username && u.password === password);

    if (!found) {
      return res.status(401).json({ success: false, message: "Usuário ou senha incorretos." });
    }

    return res.status(200).json({
      success: true,
      user: {
        name: found.name,
        username: found.username,
        email: found.email,
        role: found.role
      }
    });
  } catch (e: any) {
    console.error("[api/login]", e);

    // Fallback de emergência apenas para o administrador master, para não bloquear a manutenção do sistema.
    if (username === MASTER_USER.username && password === MASTER_USER.password) {
      return res.status(200).json({
        success: true,
        warning: e?.message,
        user: {
          name: MASTER_USER.name,
          username: MASTER_USER.username,
          email: MASTER_USER.email,
          role: MASTER_USER.role
        }
      });
    }

    return res.status(500).json({
      success: false,
      message: e?.message || "Erro ao conectar com o banco de dados de usuários.",
      error: String(e)
    });
  }
}
