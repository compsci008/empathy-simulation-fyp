const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const db = require("./db");

const port = Number(process.env.PORT || 4173);
const rootDir = __dirname;

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

// --- API routes now read/write through db.js instead of the filesystem ---

async function handleApi(request, response, pathname) {
  if (pathname === "/api/scenarios" && request.method === "GET") {
    sendJson(response, 200, { scenarios: db.listScenarios() });
    return;
  }

  if (pathname.startsWith("/api/scenarios/") && request.method === "GET") {
    const id = decodeURIComponent(pathname.split("/").pop());
    try {
      sendJson(response, 200, db.getScenarioById(id));
    } catch (error) {
      sendJson(response, error.status || 404, { error: error.message });
    }
    return;
  }

  if (pathname === "/api/progress" && request.method === "GET") {
    sendJson(response, 200, db.getProgress());
    return;
  }

  if (pathname === "/api/progress" && request.method === "POST") {
    const body = await readRequestBody(request);
    const progress = body ? JSON.parse(body) : { scenarios: {} };
    sendJson(response, 200, db.saveProgress(progress));
    return;
  }

  if (pathname === "/api/progress" && request.method === "DELETE") {
    sendJson(response, 200, db.clearProgress());
    return;
  }

  sendJson(response, 404, { error: "API route not found" });
}

// --- Static file serving is unchanged: HTML/CSS/JS/images still come from disk ---

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