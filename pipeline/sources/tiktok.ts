// TikTok Display API, solo para creadores que se vincularon en «Soy este creador»
// (Login Kit, ver ESPECIFICACION.md §5 y PLAN_DE_TRABAJO.md Fase 7). No hay forma
// de leer el perfil de un tercero sin su autorización: mientras no esté vinculado,
// TikTok usa el último dato de `baseline`/`manual.json` (FORMULA.md §8 decide
// cuándo queda `stale`). El refresh token cifrado vive en Supabase
// (`creator_tokens`, solo `service_role`); pipeline/run.ts se lo pasa a este módulo,
// este módulo no toca Supabase directamente.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import {
  ENGAGEMENT_WINDOW_POSTS,
  ENGAGEMENT_MIN_POST_AGE_HOURS,
  MIN_POSTS_FOR_ENGAGEMENT,
} from "../config.js";

const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/";
const VIDEO_LIST_URL = "https://open.tiktokapis.com/v2/video/list/";

// Mismo esquema que supabase/functions/tiktok-callback/index.ts (AES-256-GCM,
// iv de 12 bytes + texto cifrado + etiqueta de 16 bytes, todo en un solo
// base64) para que ambos lados puedan leerse entre sí. TIKTOK_TOKEN_KEY es la
// misma clave en los secretos de la Edge Function y en GitHub Secrets/.env.
function tokenKey(): Buffer {
  const key = process.env.TIKTOK_TOKEN_KEY;
  if (!key) throw new Error("Falta TIKTOK_TOKEN_KEY");
  return Buffer.from(key, "base64");
}

export function decryptRefreshToken(combinedB64: string): string {
  const combined = Buffer.from(combinedB64, "base64");
  const iv = combined.subarray(0, 12);
  const authTag = combined.subarray(combined.length - 16);
  const ciphertext = combined.subarray(12, combined.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", tokenKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function encryptRefreshToken(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, authTag]).toString("base64");
}

function clientCredentials(): { clientKey: string; clientSecret: string } {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    throw new Error("Faltan TIKTOK_CLIENT_KEY y/o TIKTOK_CLIENT_SECRET");
  }
  return { clientKey, clientSecret };
}

interface RefreshedTokens {
  accessToken: string;
  /** El refresh token puede rotar en cada uso: guardar el nuevo en Supabase. */
  refreshToken: string;
}

async function refreshAccessToken(refreshToken: string): Promise<RefreshedTokens> {
  const { clientKey, clientSecret } = clientCredentials();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`TikTok oauth/token → HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

export interface TiktokSnapshot {
  followers: number | null;
  er: number | null;
  url: string;
  /** El pipeline debe volver a cifrar y guardar este valor en creator_tokens. */
  refreshedRefreshToken: string;
}

/**
 * FORMULA.md §3 — media de (me gusta + comentarios + compartidos) ÷ vistas × 100,
 * sobre las últimas ENGAGEMENT_WINDOW_POSTS publicaciones con
 * ENGAGEMENT_MIN_POST_AGE_HOURS horas de antigüedad como mínimo.
 */
export async function fetchLinkedCreatorSnapshot(
  refreshToken: string,
): Promise<TiktokSnapshot> {
  const { accessToken, refreshToken: refreshedRefreshToken } =
    await refreshAccessToken(refreshToken);
  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  const userRes = await fetch(
    `${USER_INFO_URL}?fields=open_id,username,follower_count`,
    { headers: authHeaders },
  );
  if (!userRes.ok) {
    throw new Error(`TikTok user/info → HTTP ${userRes.status}: ${await userRes.text()}`);
  }
  const user = (await userRes.json()).data?.user;
  const followers: number | null = user?.follower_count ?? null;
  const username: string = user?.username ?? "";

  const videosRes = await fetch(VIDEO_LIST_URL, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ max_count: 20 }),
  });
  if (!videosRes.ok) {
    throw new Error(`TikTok video/list → HTTP ${videosRes.status}: ${await videosRes.text()}`);
  }
  const videos = (await videosRes.json()).data?.videos ?? [];

  const now = Date.now();
  const minAgeMs = ENGAGEMENT_MIN_POST_AGE_HOURS * 60 * 60 * 1000;
  const eligible = videos
    .filter((v: any) => now - v.create_time * 1000 >= minAgeMs)
    .slice(0, ENGAGEMENT_WINDOW_POSTS);

  let er: number | null = null;
  if (eligible.length >= MIN_POSTS_FOR_ENGAGEMENT) {
    const rates = eligible
      .map((v: any) => {
        const views = v.view_count ?? 0;
        if (!views) return null;
        const engaged = (v.like_count ?? 0) + (v.comment_count ?? 0) + (v.share_count ?? 0);
        return (engaged / views) * 100;
      })
      .filter((r: number | null): r is number => r != null);
    if (rates.length >= MIN_POSTS_FOR_ENGAGEMENT) {
      er = rates.reduce((a: number, b: number) => a + b, 0) / rates.length;
    }
  }

  return {
    followers,
    er,
    url: `https://www.tiktok.com/@${username}`,
    refreshedRefreshToken,
  };
}
