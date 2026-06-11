export default function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Método não permitido" });
  }

  const { email, name, role } = req.body;
  if (!email || !name || !role) {
    return res.status(400).json({ success: false, message: "E-mail, Nome e Nível de acesso são obrigatórios." });
  }
  
  return res.status(200).json({ 
    success: true, 
    message: `E-mail de confirmação ou requisição de acesso disparado para ${email}!`,
    timestamp: new Date().toISOString(),
    simulatedBody: `Prezado(a) ${name},\n\nSua credencial de acesso ao Painel de Auditoria de Operações foi configurada no nível: *${role}*.\n\nCaso tenha alguma dúvida, contate o administrador de TI.`
  });
}
