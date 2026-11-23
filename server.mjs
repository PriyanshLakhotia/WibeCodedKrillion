import { randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { createGame, GameError } from "./game/engine.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = await realpath(join(root, "public"));
const dataDir = resolve(process.env.KRILLION_DATA_DIR || join(root, ".data"));
await mkdir(dataDir, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(join(dataDir, "dives.sqlite"));
const game = createGame({
  db,
  key: process.env.OPENAI_API_KEY?.trim(),
  model: process.env.OPENAI_QUESTION_MODEL?.trim() || "gpt-6.1-terra",
});

const port = Number(process.env.PORT || 4317);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be between 1 and 65535.");
const allowedHosts = new Set(
  ["127.0.0.1", "localhost"].map((host) =>
    port === 80 ? host : host + ":" + port,
  ),
);
const maxBodyBytes = 4096;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function player(request, response) {
  const pair = (request.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("krillion_dive_owner="));
  const supplied = pair?.slice("krillion_dive_owner=".length);
  if (supplied && uuid.test(supplied)) return supplied;
  const id = randomUUID();
  response.setHeader(
    "Set-Cookie",
    "krillion_dive_owner=" +
      id +
      "; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000",
  );
  return id;
}

function json(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}

async function readObject(request) {
  if (
    request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    throw new GameError(415, "Send a JSON request.");
  }
  if (Number(request.headers["content-length"]) > maxBodyBytes) {
    request.resume();
    throw new GameError(413, "The request is too large.");
  }
  const payload = await new Promise((accept, reject) => {
    const chunks = [];
    let length = 0;
    request.on("data", (chunk) => {
      length += chunk.length;
      if (length > maxBodyBytes)
        reject(new GameError(413, "The request is too large."));
      else chunks.push(chunk);
    });
    request.on("error", reject);
    request.on("end", () => accept(Buffer.concat(chunks).toString("utf8")));
  });
  try {
    const object = JSON.parse(payload);
    if (object && typeof object === "object" && !Array.isArray(object))
      return object;
  } catch {
    /* Report invalid input uniformly. */
  }
  throw new GameError(400, "Send a valid JSON object.");
}

async function handle(request, response) {
  const host = request.headers.host?.toLowerCase();
  if (!allowedHosts.has(host))
    throw new GameError(403, "Use the local game address.");
  const path = new URL(request.url, "http://" + host).pathname;
  const method = request.method;
  if (path.startsWith("/api/")) {
    if (
      method === "POST" &&
      request.headers.origin !== undefined &&
      request.headers.origin !== "http://" + host
    ) {
      throw new GameError(403, "Open the game in a local tab.");
    }
    const owner = player(request, response);
    if (path === "/api/status" && method === "GET")
      return json(response, 200, game.status(owner));
    if (path === "/api/dives" && method === "POST") {
      const body = await readObject(request);
      return json(
        response,
        200,
        await game.start(owner, body.mode, body.requestId, body.fieldGuide),
      );
    }
    const match = /^\/api\/dives\/([^/]+)$/.exec(path);
    if (match && uuid.test(match[1])) {
      if (method === "GET")
        return json(response, 200, game.read(owner, match[1]));
      if (method === "POST")
        return json(
          response,
          200,
          await game.act(owner, match[1], await readObject(request)),
        );
    }
    throw new GameError(404, "No such game endpoint.");
  }
  if (method !== "GET" && method !== "HEAD")
    throw new GameError(405, "Use GET to load a game file.");
  let decoded;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    throw new GameError(400, "Invalid file path.");
  }
  if (
    decoded.includes("\0") ||
    decoded.includes("\\") ||
    decoded.split("/").some((part) => part.startsWith("."))
  ) {
    throw new GameError(404, "File not found.");
  }
  try {
    const file = await realpath(
      join(publicDir, decoded === "/" ? "index.html" : decoded),
    );
    if (!file.startsWith(publicDir + sep) || !(await stat(file)).isFile())
      throw new GameError(404, "File not found.");
    const bytes = method === "HEAD" ? null : await readFile(file);
    if (decoded === "/") player(request, response);
    response.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(bytes);
  } catch (error) {
    if (["ENOENT", "ENOTDIR", "EACCES"].includes(error.code))
      throw new GameError(404, "File not found.");
    throw error;
  }
}

const server = createServer((request, response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  handle(request, response).catch((error) => {
    if (response.destroyed || response.headersSent) return;
    if (error instanceof GameError)
      json(response, error.status, { error: error.message });
    else
      json(response, 500, {
        error: "The local game could not finish that request.",
      });
  });
});
server.listen(port, "127.0.0.1", () =>
  console.log("Wibe Coded Krillion is ready at http://127.0.0.1:" + port),
);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () =>
    server.close(() => {
      db.close();
    }),
  );
}
