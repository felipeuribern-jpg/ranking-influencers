// Estado firmado para el flujo OAuth de TikTok (docs/AUDITORIA-2026-10-02.md, A2).
// El `state` ya no es el id del perfil en claro: lleva el perfil, la persona que lo
// pidió y una caducidad, firmados con HMAC-SHA256. Solo `tiktok-start` puede
// emitirlo (tras comprobar la sesión y un reclamo aprobado) y `tiktok-callback`
// lo verifica antes de guardar ningún token. Funciones puras: se prueban en
// pipeline/state.test.ts y corren igual en Deno y en Node.

export interface OAuthState {
  influencerId: string;
  userId: string;
  expiresAt: number; // milisegundos desde epoch
  nonce: string;
}

const STATE_TTL_MS = 10 * 60 * 1000;

function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (text.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function signState(
  input: { influencerId: string; userId: string },
  secret: string,
  now: number = Date.now(),
): Promise<string> {
  if (!secret) throw new Error("falta el secreto para firmar el state");
  const state: OAuthState = {
    influencerId: input.influencerId,
    userId: input.userId,
    expiresAt: now + STATE_TTL_MS,
    nonce: toBase64Url(crypto.getRandomValues(new Uint8Array(12))),
  };
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(state)));
  const signature = toBase64Url(await hmac(secret, payload));
  return `${payload}.${signature}`;
}

// Devuelve el estado si la firma es válida y no caducó; si no, null (nunca lanza).
export async function verifyState(
  token: string,
  secret: string,
  now: number = Date.now(),
): Promise<OAuthState | null> {
  try {
    if (!secret) return null;
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra !== undefined) return null;
    const expected = await hmac(secret, payload);
    if (!sameBytes(expected, fromBase64Url(signature))) return null;
    const state = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as OAuthState;
    if (
      typeof state.influencerId !== "string" ||
      typeof state.userId !== "string" ||
      typeof state.expiresAt !== "number" ||
      state.expiresAt < now
    ) {
      return null;
    }
    return state;
  } catch {
    return null;
  }
}
