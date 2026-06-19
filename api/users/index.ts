import usersHandler from "../usersHandler.js";

export default async function handler(req: any, res: any) {
  return usersHandler(req, res);
}
