const createSupabaseAccounts = require("../supabase-accounts.cjs");
const { sendJson, routeAccountRequest } = require("../account-http.cjs");

const settings = [
  process.env.FITNESS_PUBLIC_ORIGIN?.trim(),
  ...[process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
    .filter(Boolean).map((host) => `https://${host}`),
].filter(Boolean);
const origins = new Map(settings.map((value) => {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.pathname !== "/" || url.username || url.password || url.search || url.hash) {
    throw new Error("Die öffentliche App-Adresse muss eine HTTPS-Adresse ohne Pfad sein.");
  }
  return [url.host, url.origin];
}));
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
const handleAccounts = supabaseUrl && publishableKey ? createSupabaseAccounts(supabaseUrl, publishableKey) : null;

module.exports = function gateway(request, response) {
  const origin = origins.get(request.headers.host);
  if (!origin) return sendJson(response, 403, { error: "Diese Adresse ist für die App nicht eingerichtet." });
  if (!handleAccounts) return sendJson(response, 503, { error: "Supabase ist für dieses Deployment noch nicht eingerichtet." });
  const url = new URL(request.url, origin);
  const pathname = url.pathname === "/api/gateway" ? url.searchParams.get("__fitness_route") ?? "" : url.pathname;
  return routeAccountRequest(request, response, pathname, origin, handleAccounts);
};
