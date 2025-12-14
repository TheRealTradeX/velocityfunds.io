export const onRequestOptions = () =>
  new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function json(status, body = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON payload." });
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!EMAIL_REGEX.test(email)) {
    return json(400, { error: "A valid email address is required." });
  }

  const db = env.WAITLIST_DB;
  if (!db) return json(500, { error: "WAITLIST_DB binding is not configured." });

  const emailHash = await sha256(email);
  const now = new Date().toISOString();
  const sourceIp = request.headers.get("CF-Connecting-IP") || null;

  try {
    await db
      .prepare(
        "CREATE TABLE IF NOT EXISTS waitlist (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, email_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, source_ip TEXT)"
      )
      .run();

    await db
      .prepare(
        "INSERT INTO waitlist (email, email_hash, created_at, source_ip) VALUES (?1, ?2, ?3, ?4)"
      )
      .bind(email, emailHash, now, sourceIp)
      .run();

    return json(200, { ok: true });
  } catch (error) {
    const message = String(error).toLowerCase();
    if (message.includes("unique")) {
      return json(409, { error: "Already registered." });
    }
    return json(500, { error: "Unable to save right now." });
  }
}
