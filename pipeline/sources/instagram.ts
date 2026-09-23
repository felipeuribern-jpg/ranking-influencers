// Instagram Graph API — Business Discovery. Requiere una cuenta profesional propia
// (IG_BUSINESS_ACCOUNT_ID) y un token de larga duración de una app de Meta
// (META_ACCESS_TOKEN). Solo funciona sobre cuentas profesionales ajenas públicas.
// Ver docs/FUENTES_DE_DATOS.md.
const GRAPH_BASE = "https://graph.facebook.com/v21.0";

function credentials(): { businessId: string; token: string } {
  const businessId = process.env.IG_BUSINESS_ACCOUNT_ID;
  const token = process.env.META_ACCESS_TOKEN;
  if (!businessId || !token) {
    throw new Error("Faltan IG_BUSINESS_ACCOUNT_ID y/o META_ACCESS_TOKEN");
  }
  return { businessId, token };
}

export interface InstagramSnapshot {
  followers: number | null;
  er: number | null;
  url: string;
}

/**
 * FORMULA.md §3 — media de (me gusta + comentarios) ÷ seguidores × 100, sobre las
 * últimas 12 publicaciones (media API business_discovery trae como máximo 25 con
 * el field expansion usado abajo).
 */
export async function fetchBusinessDiscovery(
  username: string,
): Promise<InstagramSnapshot | null> {
  const { businessId, token } = credentials();
  const fields =
    `business_discovery.username(${username})` +
    `{followers_count,media_count,media.limit(25){like_count,comments_count,timestamp}}`;
  const url = new URL(`${GRAPH_BASE}/${businessId}`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", token);

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 400) return null; // cuenta no encontrada o no profesional
    throw new Error(`Instagram Graph API → HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const bd = data.business_discovery;
  if (!bd) return null;

  const followers: number | null = bd.followers_count ?? null;
  const minAgeMs = 48 * 60 * 60 * 1000;
  const now = Date.now();
  const posts = (bd.media?.data ?? [])
    .filter((m: any) => now - new Date(m.timestamp).getTime() >= minAgeMs)
    .slice(0, 12);

  let er: number | null = null;
  if (posts.length >= 3 && followers) {
    const rates = posts.map(
      (m: any) => ((m.like_count ?? 0) + (m.comments_count ?? 0)) / followers * 100,
    );
    er = rates.reduce((a: number, b: number) => a + b, 0) / rates.length;
  }

  return { followers, er, url: `https://www.instagram.com/${username}/` };
}
