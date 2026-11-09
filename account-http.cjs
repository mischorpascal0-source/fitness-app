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

function readEmail(value) {
  const email = typeof value === "string" ? value.trim() : "";
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function readRegistration(body) {
  const email = readEmail(body?.username);
  const password = body?.password;
  if (!email) return { error: "Gib eine gültige E-Mail-Adresse ein." };
  if (typeof password !== "string" || password.length < 12 || password.length > 128) {
    return { error: "Verwende ein Passwort mit 12–128 Zeichen." };
  }
  if (password !== body.passwordConfirmation) return { error: "Die Passwörter stimmen nicht überein." };

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  if ([firstName, lastName].some((name) => !name || name.length > 80 || /\p{Cc}/u.test(name))) {
    return { error: "Gib einen Vor- und Nachnamen mit jeweils bis zu 80 Zeichen ein." };
  }

  const birthDate = typeof body.birthDate === "string" ? body.birthDate : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || birthDate.startsWith("0000")) {
    return { error: "Gib ein gültiges Geburtsdatum ein." };
  }
  const date = new Date(birthDate + "T00:00:00Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== birthDate || date > new Date()) {
    return { error: "Gib ein gültiges Geburtsdatum ein, das nicht in der Zukunft liegt." };
  }

  return { email, profile: { first_name: firstName, last_name: lastName, birth_date: birthDate } };
}

function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(data));
}

function sendEmailConfirmation(response, query) {
  // This page reports Supabase's redirect result. Account access still requires sign-in.
  const confirmed = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(query.get("code") ?? "") &&
    !["error", "error_code", "error_description"].some((key) => query.has(key));
  const title = confirmed ? "Deine E-Mail wurde bestätigt." : "E-Mail-Bestätigung fehlgeschlagen";
  const message = confirmed ? "Du kannst dich jetzt mit deiner E-Mail-Adresse und deinem Passwort anmelden."
    : "Der Bestätigungslink ist ungültig oder abgelaufen. Wenn du deine E-Mail bereits bestätigt hast, kannst du dich anmelden.";
  response.writeHead(confirmed ? 200 : 400, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'",
  });
  response.end(`<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#070A08">
  <title>${title} · Fitness-App</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="shell login-shell" aria-labelledby="confirmation-title">
    <header class="page-header">
      <div class="app-brand">Fitness-App</div>
      <h1 id="confirmation-title">${title}</h1>
    </header>
    <section class="card library-panel">
      <p>${message}</p>
      <div class="planner-actions"><a class="plan-button primary" href="/">Zur Anmeldung</a></div>
    </section>
  </main>
</body>
</html>`);
}

async function routeAccountRequest(request, response, pathname, origin, handleAccounts) {
  if (pathname === "/auth/confirm" && request.method === "GET") {
    return sendEmailConfirmation(response, new URL(request.url, origin).searchParams);
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
    if (pathname === "/api/social" && !handleAccounts.resolveSession) {
      return sendJson(response, 503, { error: "Social benötigt die Supabase-Kontospeicherung." });
    }
    if (pathname === "/api/garmin") {
      return await require("./cardio-garmin.cjs")(request, response, origin, handleAccounts);
    }
    return await handleAccounts(request, response, pathname, sendJson, origin);
  } catch (error) {
    console.error("Fehler bei einer API-Anfrage.", error.code ?? error.name);
    if (!response.headersSent) sendJson(response, 500, { error: "Die Anfrage konnte nicht verarbeitet werden." });
  }
}

module.exports = { readJson, planIdFromPath, readEmail, readRegistration, sendJson, routeAccountRequest };
