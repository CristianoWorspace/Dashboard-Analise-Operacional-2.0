import usersHandler from "../users";

export default async function handler(req: any, res: any) {
  // Repassa para o handler principal, o Vercel preenche req.query.username automaticamente
  return usersHandler(req, res);
}
