const maxBodyBytes = 1024 * 1024;

async function readJson(request) {
  if (Number(request.headers["content-length"]) > maxBodyBytes) {
    request.resume();
    return null;
  }
  try {
    const parsed = request.body;
    if (parsed !== undefined) {
      const raw = typeof parsed === "string" ? parsed
        : Buffer.isBuffer(parsed) ? parsed.toString("utf8") : JSON.stringify(parsed);
      if (Buffer.byteLength(raw) > maxBodyBytes) return null;
      return JSON.parse(raw);
    }
  } catch {
    return null;
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      request.resume();
      return null;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

function planIdFromPath(pathname) {
  return pathname.match(/^\/api\/plans\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/)?.[1];
}

function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(data));
}

async function routeAccountRequest(request, response, pathname, origin, handleAccounts) {
  if (pathname === "/auth/confirm" && request.method === "GET") {
    response.writeHead(303, { Location: "/#trainingsplan", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    return response.end();
  }
  if (!pathname.startsWith("/api/")) return sendJson(response, 404, { error: "Seite nicht gefunden." });
  if (request.method !== "GET") {
    if (request.headers.origin && request.headers.origin !== origin) {
      return sendJson(response, 403, { error: "Diese Anfrage muss aus der Fitness-App kommen." });
    }
    if (request.headers["content-type"]?.split(";")[0] !== "application/json") {
      return sendJson(response, 415, { error: "JSON-Anfrage erwartet." });
    }
  }
  try {
    return await handleAccounts(request, response, pathname, sendJson, origin);
  } catch (error) {
    console.error("Fehler bei einer API-Anfrage.", error.code ?? error.name);
    if (!response.headersSent) sendJson(response, 500, { error: "Die Anfrage konnte nicht verarbeitet werden." });
  }
}

module.exports = { readJson, planIdFromPath, sendJson, routeAccountRequest };
