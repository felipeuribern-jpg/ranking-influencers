// Graph API de páginas de Facebook. Usa el mismo token de Meta que Instagram.
// La interacción requiere el permiso «Page Public Content Access» (revisión de
// Meta); si no está aprobado, Facebook puntúa solo por seguidores (er = null).
// Ver docs/FUENTES_DE_DATOS.md.
const GRAPH_BASE = "https://graph.facebook.com/v21.0";

function token(): string {
  const t = process.env.META_ACCESS_TOKEN;
  if (!t) throw new Error("Falta la variable de entorno META_ACCESS_TOKEN");
  return t;
}

export interface FacebookSnapshot {
  followers: number | null;
  er: number | null;
  url: string;
}

export async function fetchPageSnapshot(
  pageIdOrUsername: string,
): Promise<FacebookSnapshot | null> {
  const url = new URL(`${GRAPH_BASE}/${pageIdOrUsername}`);
  url.searchParams.set("fields", "followers_count,fan_count,link");
  url.searchParams.set("access_token", token());

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 400 || res.status === 404) return null;
    throw new Error(`Facebook Graph API → HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const followers: number | null = data.followers_count ?? data.fan_count ?? null;

  // La interacción (reacciones + comentarios + compartidos ÷ seguidores × 100)
  // se calcula solo si el permiso de contenido público de páginas está aprobado;
  // hasta entonces se deja null a propósito (FORMULA.md §3).
  const er: number | null = null;

  return {
    followers,
    er,
    url: data.link ?? `https://www.facebook.com/${pageIdOrUsername}`,
  };
}
