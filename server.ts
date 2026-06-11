import express from "express";
import path from "path";
import fs from "fs";

const app = express();
const PORT = 3000;

app.use(express.json());

// Robust user storage with write error handling and in-memory cache fallbacks (perfect for serverless read-only hosts like Vercel)
const DEFAULT_USERS = [
  {
    name: "Cristiano Rafael Kuhn",
    username: "cristiano.kuhn",
    password: "9784Pqa@",
    email: "cristianokuhn7@gmail.com",
    role: "Admin"
  }
];

const USERS_FILE = path.join(process.cwd(), "users.json");
const TMP_USERS_FILE = path.join("/tmp", "users.json");

// Keep an in-memory cache of the operational database for instantaneous updates and bulletproof performance
let memoryUsers: any[] | null = null;

function readUsersFromFile() {
  if (memoryUsers !== null) {
    return memoryUsers;
  }

  // Attempt 1: Read from writable /tmp fallback directory if it exists
  try {
    if (fs.existsSync(TMP_USERS_FILE)) {
      const data = fs.readFileSync(TMP_USERS_FILE, "utf-8");
      memoryUsers = JSON.parse(data);
      console.log("[UsersDB] Data queried successfully from local writable scratchpad (/tmp/users.json).");
      return memoryUsers;
    }
  } catch (err) {
    console.warn("[UsersDB] Skip /tmp read (could compile or run on different filesystem scope):", err);
  }

  // Attempt 2: Read from the workspace package directory loaded via git branch
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      memoryUsers = JSON.parse(data);
      console.log("[UsersDB] Data queried successfully from workspace root (users.json).");
      return memoryUsers;
    }
  } catch (err) {
    console.error("[UsersDB] Could not read master workspace users.json file:", err);
  }

  // Attempt 3: Compile fallback credentials
  console.log("[UsersDB] Default fallback initialized in application scope memory.");
  memoryUsers = DEFAULT_USERS;
  return memoryUsers;
}

function writeUsersToFile(users: any[]) {
  // Keep active server sessions synced right away in the node execution thread
  memoryUsers = users;

  // Action 1: Attempt standard write to the persistent workspace root
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
    console.log("[UsersDB] Saved successfully to local workspace users.json file.");
    return true;
  } catch (err: any) {
    console.warn(`[UsersDB] Local workspace read-only constraints triggered (this is normal behavior for Vercel/Serverless): ${err.message}`);
  }

  // Action 2: Attempt fallback secure scratch space write (e.g. /tmp for AWS Lambda / Vercel cloud environments)
  try {
    const tmpDir = path.dirname(TMP_USERS_FILE);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    fs.writeFileSync(TMP_USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
    console.log("[UsersDB] Copy secured in writable fallback environment (/tmp/users.json).");
    return true;
  } catch (err: any) {
    console.error("[UsersDB] Scratchpad fallback write error:", err);
  }

  // Return true because memory state is up-to-date and fully functional for live users
  return true;
}

// API Route: Secure user login validation (from USUARIOS tab)
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  
  const u = String(username || "").trim().toLowerCase();
  const p = String(password || "").trim();

  const users = readUsersFromFile();
  const foundUser = users.find((user: any) => user.username.toLowerCase() === u && user.password === p);

  if (foundUser) {
    return res.json({
      success: true,
      user: {
        name: foundUser.name,
        username: foundUser.username,
        email: foundUser.email,
        role: foundUser.role
      }
    });
  }

  return res.json({
    success: false,
    message: "Usuário ou senha incorretos."
  });
});

// API Route: List all registered users
app.get("/api/users", (req, res) => {
  const users = readUsersFromFile();
  res.json({ success: true, users });
});

// API Route: Create new user
app.post("/api/users", async (req, res) => {
  const { name, username, password, email, role } = req.body;
  
  if (!name || !username || !password || !email || !role) {
    return res.status(400).json({ success: false, message: "Todos os campos são obrigatórios." });
  }

  const u = String(username).trim().toLowerCase();
  const users = readUsersFromFile();

  if (users.some((user: any) => user.username.toLowerCase() === u)) {
    return res.status(400).json({ success: false, message: "Nome de usuário já cadastrado." });
  }

  const newUser = {
    name: String(name).trim(),
    username: u,
    password: String(password).trim(),
    email: String(email).trim(),
    role: String(role).trim()
  };

users.push(newUser);
writeUsersToFile(users);
try {
  const response = await fetch(
    "https://script.google.com/macros/s/AKfycbyt9oKLdVTEoBlFW9NThj7usEkYYzRbDJZOY_DY9cnnrxT-L-ZrWJj8UuSuBf4BgTBKdQ/exec",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newUser)
    }
  );

  console.log(
    "[USUARIOS] Apps Script:",
    await response.text()
  );
} catch (err) {
  console.error(
    "[USUARIOS] Erro Apps Script:",
    err
  );
}

try {
  await fetch(
    "https://script.google.com/macros/s/AKfycbyt9oKLdVTEoBlFW9NThj7usEkYYzRbDJZOY_DY9cnnrxT-L-ZrWJj8UuSuBf4BgTBKdQ/exec",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newUser),
    }
  );
} catch (err) {
  console.error("[USUARIOS] Falha ao gravar na planilha:", err);
}

res.json({
  success: true,
  user: newUser,
});
});

// API Route: Edit user credentials or profile
app.put("/api/users/:username", (req, res) => {
  const { username } = req.params;
  const { name, password, email, role } = req.body;

  const u = String(username).trim().toLowerCase();
  const users = readUsersFromFile();
  const userIndex = users.findIndex((user: any) => user.username.toLowerCase() === u);

  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: "Usuário não encontrado." });
  }

  if (name) users[userIndex].name = String(name).trim();
  if (password) users[userIndex].password = String(password).trim();
  if (email) users[userIndex].email = String(email).trim();
  if (role) users[userIndex].role = String(role).trim();

  writeUsersToFile(users);
  res.json({ success: true, user: users[userIndex] });
});

// API Route: Delete user account
app.delete("/api/users/:username", (req, res) => {
  const { username } = req.params;
  const u = String(username).trim().toLowerCase();

  if (u === "cristiano.kuhn") {
    return res.status(400).json({ success: false, message: "O administrador master não pode ser deletado." });
  }

  const users = readUsersFromFile();
  const filtered = users.filter((user: any) => user.username.toLowerCase() !== u);

  if (filtered.length === users.length) {
    return res.status(404).json({ success: false, message: "Usuário não encontrado." });
  }

  writeUsersToFile(filtered);
  res.json({ success: true, message: "Usuário removido com sucesso." });
});

// API Route: Simulated email dispatch
app.post("/api/users/request-email", (req, res) => {
  const { email, name, role } = req.body;
  if (!email || !name || !role) {
    return res.status(400).json({ success: false, message: "E-mail, Nome e Nível de acesso são obrigatórios." });
  }
  
  console.log(`[Email Dispatch Simulation] Sent access information email to ${name} <${email}> as role: ${role}`);
  
  res.json({ 
    success: true, 
    message: `E-mail de confirmação ou requisição de acesso disparado para ${email}!`,
    timestamp: new Date().toISOString(),
    simulatedBody: `Prezado(a) ${name},\n\nSua credencial de acesso ao Painel de Auditoria de Operações foi configurada no nível: *${role}*.\n\nCaso tenha alguma dúvida, contate o administrador de TI.`
  });
});

// API Route: Fetch and process Google Sheets data
app.get("/api/data", async (req, res) => {
  const sheetUrl =
    "https://script.google.com/macros/s/AKfycbyt9oKLdVTEoBlFW9NThj7usEkYYzRbDJZOY_DY9cnnrxT-L-ZrWJj8UuSuBf4BgTBKdQ/exec";

  try {
    console.log("[Proxy] Consultando Google Apps Script...");

    const response = await fetch(sheetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Google Apps Script respondeu com status ${response.status}`
      );
    }

    const rawText = await response.text();

    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      console.error("[Proxy] Resposta inválida recebida:");
      console.error(rawText.substring(0, 1000));

      throw new Error(
        "O Apps Script não retornou JSON válido."
      );
    }

    const registros = parsed?.data || parsed;

    console.log(
      `[Proxy] Dados carregados com sucesso. Registros: ${
        Array.isArray(registros) ? registros.length : 0
      }`
    );

    res.setHeader("Cache-Control", "no-store");

    return res.json({
      success: true,
      source: "live",
      updated_at: new Date().toISOString(),
      total_records: Array.isArray(registros)
        ? registros.length
        : 0,
      data: registros,
    });
  } catch (error: any) {
    console.error("[Proxy] Falha ao consultar Apps Script:");
    console.error(error);

    const mockData = generateMockData();

    return res.json({
      success: false,
      source: "demo",
      error: error?.message || "Erro desconhecido",
      total_records: mockData.length,
      data: mockData,
    });
  }
});

// Generate realistic mock data matching the exact columns and business operations requested
function generateMockData() {
  const statuses = ["Concluído", "Não Realizado", "Reagendado", "Pendente"];
  const cities = ["Gramado", "Canela", "Feliz", "São José do Hortêncio", "Esteio"];
  const techNames = [
    "Marcelo Pinto",
    "Axel de Andrade",
    "Robson Nunes",
    "Davi Kempf",
    "Diego Nascimento",
    "César Zanco",
    "Ernesto",
    "Leonardo Oliveira",
    "Cleiton Araújo",
    "Itamar Pontes"
  ];
  
  const demandTypes = [
    "Deslocamento - Fibra - Lentidão / Suporte",
    "Deslocamento - Fibra - Sem acesso / Suporte",
    "Deslocamento - Fibra - Melhoria / Suporte",
    "Deslocamento - Retrabalho - Lentidão / Retrabalho",
    "Instalação Fibra / Comercial",
    "Migração Tecnologia / Comercial",
    "Recolhimento Equipamento / Cancelado",
    "Cancelamento de Assinatura e Recolhimento",
    "Infraestrutura de Rede e Engenharia - Fusão Síncrona",
    "Engenharia de Poste e Ampliação de Infraestrutura",
    "Instalação Padrão FTTH"
  ];

  const reasonsForNaoRealizado = [
    "Enviado a cobrança automática",
    "Cliente ausente no endereço",
    "Sem viabilidade técnica no local",
    "Equipamento avariado ou ausente"
  ];
  const reasonsForReagendado = [
    "Equipe não foi no período agendado",
    "Cliente solicitou Reagendamento/ Não pode acompanhar",
    "Sem contato telefônico com cliente no dia"
  ];

  const mock = [];
  const baseDate = new Date("2026-01-01T00:00:00.000Z");

  for (let i = 0; i < 200; i++) {
    const daysOffset = Math.floor(Math.random() * 90);
    const itemDate = new Date(baseDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);
    
    let status = statuses[Math.floor(Math.random() * statuses.length)];
    const rand = Math.random();
    if (rand < 0.65) status = "Concluído";
    else if (rand < 0.8) status = "Não Realizado";
    else if (rand < 0.93) status = "Reagendado";
    else status = "Pendente";

    const label = demandTypes[Math.floor(Math.random() * demandTypes.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const techName = techNames[Math.floor(Math.random() * techNames.length)];
    const technicianWithCity = `${techName}(${city})`;
    
    let reason = "";
    if (status === "Não Realizado") {
      reason = reasonsForNaoRealizado[Math.floor(Math.random() * reasonsForNaoRealizado.length)];
    } else if (status === "Reagendado") {
      reason = reasonsForReagendado[Math.floor(Math.random() * reasonsForReagendado.length)];
    }

    const protocolNumber = String(913000 + i);

    mock.push({
      protocol_number: protocolNumber,
      status: status,
      reason: reason,
      TipoOS: label,
      name: technicianWithCity,
      city: city,
      schedule_date: itemDate.toISOString()
    });
  }

  return mock;
}

// Bootstrapping function for dev environments or standalone serving (skipped on Vercel)
async function bootstrap() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Listen on port 3000 only when running outside of Vercel Serverless environment
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT} in standalone mode`);
    });
  }
}

bootstrap();

export default app;
