const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const { join } = require("node:path");
const { sendJson, routeAccountRequest } = require("./account-http.cjs");
const webFiles = require("./web-files.cjs");

const port = Number(process.env.PORT ?? 3000);
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
if (Boolean(supabaseUrl) !== Boolean(publishableKey)) {
  throw new Error("Setze SUPABASE_URL und SUPABASE_PUBLISHABLE_KEY gemeinsam.");
}
const publicOrigin = process.env.FITNESS_PUBLIC_ORIGIN?.trim() ? new URL(process.env.FITNESS_PUBLIC_ORIGIN) : null;
if (publicOrigin && (!supabaseUrl || publicOrigin.protocol !== "https:" || publicOrigin.pathname !== "/" ||
    publicOrigin.username || publicOrigin.password || publicOrigin.search || publicOrigin.hash)) {
  throw new Error("FITNESS_PUBLIC_ORIGIN benötigt Supabase und eine HTTPS-Adresse ohne Pfad.");
}
const handleAccounts = supabaseUrl
  ? require("./supabase-accounts.cjs")(supabaseUrl, publishableKey)
  : require("./accounts.cjs");
const staticFiles = new Map(webFiles.map((file) => ["/" + file[0], file]));
staticFiles.set("/", staticFiles.get("/index.html"));

const server = createServer(async (request, response) => {
  const localPort = request.socket.localPort;
  const host = request.headers.host;
  const origin = host && publicOrigin?.host === host ? publicOrigin.origin
    : [`127.0.0.1:${localPort}`, `localhost:${localPort}`].includes(host) ? `http://${host}` : null;
  if (!origin) return sendJson(response, 403, { error: "Diese Adresse ist für die App nicht eingerichtet." });

  const pathname = request.url.split("?")[0];
  if (pathname.startsWith("/api/") || (supabaseUrl && pathname === "/auth/confirm")) {
    return routeAccountRequest(request, response, pathname, origin, handleAccounts);
  }
  const file = staticFiles.get(pathname);
  if (!file || request.method !== "GET") return sendJson(response, 404, { error: "Seite nicht gefunden." });

  try {
    const [name, contentType] = file;
    const data = await readFile(join(__dirname, name));
    response.writeHead(200, { "Content-Type": `${contentType}; charset=utf-8` });
    response.end(data);
  } catch {
    sendJson(response, 500, { error: "Die Seite konnte nicht geladen werden." });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Fitness-App läuft auf http://127.0.0.1:${server.address().port}`);
});
