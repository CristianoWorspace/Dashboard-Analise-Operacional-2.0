// api/login.ts
type AppUser = {
  name: string;
  username: string;
  password: string;
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

async function getUsersFromSheet(): Promise<AppUser[]> {
  const response = await fetch(`${APPS_SCRIPT_URL}?action=getUsers`, { cache: "no-store" });
  const text = await response.text();

  let result: any;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`Apps Script não retornou JSON válido. Resposta: ${text.slice(0, 250)}`);
  }

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

    const found = users.find(
      (u) => u.username === username && u.password === password
    );

    if (!found) {
      return res.status(401).json({ success: false, message: "Usuário ou senha incorretos." });
    }

    return res.status(200).json({
      success: true,
      user: {
        name:     found.name,
        username: found.username,
        email:    found.email,
        role:     found.role
      }
    });
  } catch (e: any) {
    console.error("[api/login]", e);
    return res.status(500).json({
      success: false,
      message: e?.message || "Erro ao conectar com o banco de dados de usuários.",
      error: String(e)
    });
  }
}
