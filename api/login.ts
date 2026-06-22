// api/login.ts
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

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
    const response = await fetch(APPS_SCRIPT_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", username, password }),
    });

    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(`Apps Script não retornou JSON válido: ${text.slice(0, 250)}`);
    }

    if (!result.success) {
      return res.status(401).json({ success: false, message: result.message || "Usuário ou senha incorretos." });
    }

    // Repassa exatamente o que o Apps Script retornou, incluindo primeiro_acesso
    return res.status(200).json({
      success: true,
      user: {
        name:            result.user.name,
        username:        result.user.username,
        email:           result.user.email,
        role:            result.user.role,
        primeiro_acesso: result.user.primeiro_acesso ?? false,
      }
    });

  } catch (e: any) {
    console.error("[api/login]", e);
    return res.status(500).json({
      success: false,
      message: e?.message || "Erro ao conectar com o banco de dados.",
      error: String(e)
    });
  }
}
