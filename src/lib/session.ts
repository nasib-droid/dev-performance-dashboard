const COOKIE_NAME = "dashboard_session";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getKey() {
  const secret = process.env.DASHBOARD_PASSWORD;
  if (!secret) throw new Error("DASHBOARD_PASSWORD is not set");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(bytes: ArrayBuffer) {
  return Buffer.from(bytes).toString("base64url");
}

async function sign(message: string | number) {
  const key = await getKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(message)));
  return toBase64Url(sig);
}

async function verify(message: string, sig: string) {
  return crypto.subtle.verify("HMAC", await getKey(), Buffer.from(sig, "base64url"), new TextEncoder().encode(message));
}

// Feedback links are signed per Trello card, so a link can't be guessed or edited to point at
// another card. Nothing is stored; changing DASHBOARD_PASSWORD invalidates every link.
const TRELLO_ID = /^[0-9a-f]{24}$/;

export function signFeedbackLink(cardId: string) {
  return sign(`feedback:${cardId}`);
}

export async function verifyFeedbackLink(cardId: string, sig: string) {
  return TRELLO_ID.test(cardId) && /^[\w-]{43}$/.test(sig) && verify(`feedback:${cardId}`, sig);
}

export async function createSessionCookieValue() {
  const expiresAt = Date.now() + MAX_AGE_MS;
  const sig = await sign(expiresAt);
  return { value: `${expiresAt}.${sig}`, maxAgeSeconds: MAX_AGE_MS / 1000 };
}

export async function isValidSession(cookieValue: string | undefined) {
  if (!cookieValue) return false;
  const [expiresAtStr, sig] = cookieValue.split(".");
  const expiresAt = Number(expiresAtStr);
  if (!expiresAt || !sig || expiresAt < Date.now()) return false;
  return verify(String(expiresAt), sig);
}

export { COOKIE_NAME };
