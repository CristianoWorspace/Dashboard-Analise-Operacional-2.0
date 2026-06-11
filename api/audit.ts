import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

export default async function (request: VercelRequest, response: VercelResponse) {
  if (!APPS_SCRIPT_URL) {
    return response.status(500).json({ success: false, message: 'APPS_SCRIPT_URL não configurado.' });
  }

  if (request.method === 'POST') {
    // Salvar registro de auditoria
    const { date, protocol, triedToConfirm, clientConfirmed, schedulingError, whoErrored, errorReason } = request.body;

    if (!date || !protocol || !triedToConfirm || !clientConfirmed || !schedulingError || !whoErrored || !errorReason) {
      return response.status(400).json({ success: false, message: 'Todos os campos de auditoria são obrigatórios.' });
    }

    try {
      const appsScriptResponse = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'saveAuditRecord',
          record: { date, protocol, triedToConfirm, clientConfirmed, schedulingError, whoErrored, errorReason },
        }),
      });

      const result = await appsScriptResponse.json();
      return response.status(appsScriptResponse.status).json(result);
    } catch (error: any) {
      console.error('Erro ao salvar registro de auditoria:', error);
      return response.status(500).json({ success: false, message: error.message || 'Erro interno ao salvar registro de auditoria.' });
    }
  } else if (request.method === 'GET') {
    // Obter registros de auditoria
    try {
      const appsScriptResponse = await fetch(APPS_SCRIPT_URL + '?action=getAuditRecords');
      const result = await appsScriptResponse.json();
      return response.status(appsScriptResponse.status).json(result);
    } catch (error: any) {
      console.error('Erro ao obter registros de auditoria:', error);
      return response.status(500).json({ success: false, message: error.message || 'Erro interno ao obter registros de auditoria.' });
    }
  } else {
    response.setHeader('Allow', ['GET', 'POST']);
    response.status(405).end(`Method ${request.method} Not Allowed`);
  }
}
