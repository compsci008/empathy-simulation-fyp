const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const port = Number(process.env.PORT || 4173);
const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const progressFile = path.join(dataDir, "progress.json");
const scenariosDir = path.join(dataDir, "scenarios");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

async function ensureProgressFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(progressFile);
  } catch {
    await fs.writeFile(progressFile, JSON.stringify({ scenarios: {} }, null, 2));
  }
}

async function readProgress() {
  await ensureProgressFile();
  const raw = await fs.readFile(progressFile, "utf8");
  return JSON.parse(raw);
}

async function writeProgress(progress) {
  await ensureProgressFile();
  const safeProgress = progress && typeof progress === "object" ? progress : { scenarios: {} };
  await fs.writeFile(progressFile, JSON.stringify(safeProgress, null, 2));
  return safeProgress;
}

async function readScenarioFile(fileName) {
  const filePath = path.join(scenariosDir, fileName);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readScenarioList() {
  const files = await fs.readdir(scenariosDir);
  const scenarioFiles = files.filter((file) => file.endsWith(".json")).sort();
  const scenarios = await Promise.all(
    scenarioFiles.map(async (file) => {
      const scenario = await readScenarioFile(file);
      return {
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        status: scenario.status,
        available: scenario.available,
        learningObjective: scenario.learningObjective,
        order: scenario.order || 999,
        file
      };
    })
  );
  return { scenarios: scenarios.sort((a, b) => a.order - b.order) };
}

async function readScenarioById(id) {
  const safeId = id.replace(/[^a-z0-9-]/gi, "");
  return readScenarioFile(`${safeId}.json`);
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function handleApi(request, response, pathname) {
  if (pathname === "/api/scenarios" && request.method === "GET") {
    sendJson(response, 200, await readScenarioList());
    return;
  }

  if (pathname.startsWith("/api/scenarios/") && request.method === "GET") {
    const id = decodeURIComponent(pathname.split("/").pop());
    sendJson(response, 200, await readScenarioById(id));
    return;
  }

  if (pathname === "/api/progress" && request.method === "GET") {
    sendJson(response, 200, await readProgress());
    return;
  }

  if (pathname === "/api/progress" && request.method === "POST") {
    const body = await readRequestBody(request);
    const progress = body ? JSON.parse(body) : { scenarios: {} };
    sendJson(response, 200, await writeProgress(progress));
    return;
  }

  if (pathname === "/api/progress" && request.method === "DELETE") {
    const emptyProgress = { scenarios: {} };
    sendJson(response, 200, await writeProgress(emptyProgress));
    return;
  }

  sendJson(response, 404, { error: "API route not found" });
}

async function serveStatic(response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(rootDir, requestedPath));

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream"
    });
    response.end(file);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url.pathname);
      return;
    }

    await serveStatic(response, url.pathname);
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
});

server.listen(port, () => {
  console.log(`Empathy simulation server running at http://localhost:${port}`);
});
