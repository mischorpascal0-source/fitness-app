// Both adapters operate on the authenticated account; request bodies never set an owner.
function conflict() {
  return Object.assign(new Error("Die Garmin-Verbindung wurde auf einem anderen Gerät geändert. Lade die Seite neu."), { status: 409 });
}
const record = (row) => row ? { encryptedKey: row.encrypted_key, revision: row.revision } : null;

function createSupabaseStore(call, session) {
  const base = "/rest/v1/fitness_garmin_connections";
  async function query({ method = "GET", encryptedKey, revision } = {}) {
    const params = new URLSearchParams({ select: "encrypted_key,revision" });
    if (method !== "POST") params.set("owner_id", "eq." + session.user.id);
    if (revision !== undefined && revision !== null) params.set("revision", "eq." + revision);
    if (method === "POST") params.set("on_conflict", "owner_id");
    const response = await call(base + "?" + params, {
      method, token: session.access_token,
      data: method === "GET" ? undefined : { encrypted_key: encryptedKey },
      prefer: method === "GET" ? undefined : method === "POST"
        ? "resolution=ignore-duplicates,return=representation" : "return=representation",
    });
    if (!response.ok || !Array.isArray(response.body)) {
      const expired = response.status === 401 && response.body?.code !== "42501";
      const missing = ["PGRST205", "42P01", "42501"].includes(response.body?.code);
      throw Object.assign(new Error(expired ? "Deine Sitzung ist abgelaufen. Melde dich erneut an."
        : "Die Garmin-Verbindung kann gerade nicht in deinem Konto gespeichert oder geladen werden. Versuche es später erneut."),
      { status: expired ? 401 : missing ? 503 : 502 });
    }
    return response.body;
  }
  return {
    async get() { return record((await query())[0]); },
    async write(encryptedKey, revision) {
      const [changed] = await query({ method: revision == null ? "POST" : "PATCH", encryptedKey, revision });
      if (!changed) throw conflict();
      return record(changed);
    },
  };
}

function createSqliteStore(db, accountId) {
  const get = db.prepare("SELECT encrypted_key, revision FROM garmin_connections WHERE account_id = ?");
  const insert = db.prepare("INSERT INTO garmin_connections (account_id, encrypted_key) VALUES (?, ?) ON CONFLICT(account_id) DO NOTHING RETURNING encrypted_key, revision");
  const update = db.prepare("UPDATE garmin_connections SET encrypted_key = ?, revision = revision + 1 WHERE account_id = ? AND revision = ? RETURNING encrypted_key, revision");
  return {
    async get() { return record(get.get(accountId)); },
    async write(encryptedKey, revision) {
      const changed = revision == null ? insert.get(accountId, encryptedKey) : update.get(encryptedKey, accountId, revision);
      if (!changed) throw conflict();
      return record(changed);
    },
  };
}

module.exports = { createSupabaseStore, createSqliteStore };
