// api/change-password.ts
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Método não permitido." });
  }

  const { username, currentPassword, newPassword } = req.body || {};

  if (!username || !currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Campos obrigatórios ausentes." });
  }

  if (newPassword.trim().length < 6) {
    return res.status(400).json({ success: false, message: "A nova senha deve ter pelo menos 6 caracteres." });
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "changePassword",
        username,
        currentPassword,
        newPassword,
      }),
    });

    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(`Apps Script não retornou JSON válido: ${text.slice(0, 250)}`);
    }

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message || "Erro ao alterar senha." });
    }

    return res.status(200).json({ success: true, message: "Senha alterada com sucesso." });

  } catch (e: any) {
    console.error("[api/change-password]", e);
    return res.status(500).json({
      success: false,
      message: e?.message || "Erro ao conectar com o banco de dados.",
      error: String(e)
    });
  }
}
