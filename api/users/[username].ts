// api/users/[username].ts
import usersHandler from "../usersHandler";

export default async function handler(req: any, res: any) {
  return usersHandler(req, res);
}
