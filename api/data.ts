// api/data.ts — Vercel Serverless
// Substitua o arquivo atual por este para deixar a URL do Apps Script configurável e a ação explícita.

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

export default async function handler(req: any, res: any) {
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getData`, { cache: "no-store" });
    const text = await response.text();

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Apps Script não retornou JSON válido. Resposta inicial: ${text.slice(0, 250)}`);
    }

    if (!response.ok) {
      throw new Error(parsed?.message || `Apps Script respondeu HTTP ${response.status}.`);
    }

    return res.status(200).json({
      success: parsed.success !== false,
      source: "live",
      data: parsed.data || parsed.rows || parsed
    });
  } catch (e: any) {
    console.error("[api/data]", e);
    return res.status(500).json({
      success: false,
      source: "error",
      error: e?.message || String(e),
      data: []
    });
  }
}
