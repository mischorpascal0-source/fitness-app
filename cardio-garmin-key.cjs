const { createCipheriv, createDecipheriv, createHash, randomBytes } = require("node:crypto");
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
let localSecret;
function secret() {
  const configured = process.env.FITNESS_GARMIN_COOKIE_KEY;
  if (configured && /^[a-f0-9]{64}$/i.test(configured)) return Buffer.from(configured, "hex");
  if (process.env.VERCEL) throw new Error("Garmin-Schlüsselspeicherung ist auf dem Server noch nicht eingerichtet.");
  if (!localSecret) {
    const directory = join(__dirname, ".data");
    const filename = join(directory, "garmin-cookie.key");
    mkdirSync(directory, { recursive: true });
    try { writeFileSync(filename, randomBytes(32), { flag: "wx", mode: 0o600 }); }
    catch (error) { if (error.code !== "EEXIST") throw error; }
    localSecret = readFileSync(filename);
  }
  if (localSecret.length !== 32) throw new Error("Ungültiger Schlüssel für die Garmin-Speicherung.");
  return localSecret;
}
const cookieName = (account) => "fitness_garmin_" + createHash("sha256").update(account).digest("hex").slice(0, 20);
function save(response, origin, account, apiKey) {
  let value = "";
  if (apiKey) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", secret(), iv);
    cipher.setAAD(Buffer.from(account));
    const data = Buffer.from(JSON.stringify({ apiKey, expires: Date.now() + 365 * 86400000 }));
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    value = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
  }
  const cookie = `${cookieName(account)}=${value}; Path=/api/garmin; HttpOnly; SameSite=Strict; Max-Age=${apiKey ? 365 * 86400 : 0}${origin.startsWith("https:") ? "; Secure" : ""}`;
  const previous = response.getHeader?.("Set-Cookie");
  response.setHeader("Set-Cookie", [...(Array.isArray(previous) ? previous : previous ? [previous] : []), cookie]);
}
function read(request, account) {
  const entry = request.headers.cookie?.split(/;\s*/).find((part) => part.startsWith(cookieName(account) + "="));
  if (!entry) return null;
  try {
    const data = Buffer.from(entry.slice(entry.indexOf("=") + 1), "base64url");
    const decipher = createDecipheriv("aes-256-gcm", secret(), data.subarray(0, 12));
    decipher.setAAD(Buffer.from(account));
    decipher.setAuthTag(data.subarray(12, 28));
    const result = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString());
    return typeof result.apiKey === "string" && result.expires > Date.now() ? result.apiKey : null;
  } catch { return null; }
}
module.exports = { save, read };
