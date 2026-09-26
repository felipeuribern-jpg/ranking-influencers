// YouTube Data API v3. Requiere el secreto YOUTUBE_API_KEY (ver docs/FUENTES_DE_DATOS.md).
// Presupuesto de cuota por canal y día: 1 (channels.list) + 1 (playlistItems.list)
// + 1 (videos.list, hasta 50 ids en una sola llamada) = 3 unidades.
import {
  ENGAGEMENT_WINDOW_POSTS,
  ENGAGEMENT_MIN_POST_AGE_HOURS,
  MIN_POSTS_FOR_ENGAGEMENT,
} from "../config.js";

const API_BASE = "https://www.googleapis.com/youtube/v3";

function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("Falta la variable de entorno YOUTUBE_API_KEY");
  return key;
}

async function apiGet(path: string, params: Record<string, string>): Promise<any> {
  const url = new URL(`${API_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", apiKey());
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`YouTube API ${path} → HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export interface YoutubeChannelSnapshot {
  channelId: string;
  title: string;
  followers: number | null;
  description: string;
  uploadsPlaylistId: string | null;
  url: string;
  /** País declarado por el propio canal (snippet.country), si lo configuró. */
  country: string | null;
}

/**
 * Resuelve un handle (@usuario o channelId literal) a channelId.
 * Guarda el resultado en data/resolved.json (lo hace pipeline/run.ts) para no
 * gastar cuota todos los días.
 */
export async function resolveChannelId(handle: string): Promise<string | null> {
  if (/^UC[\w-]{22}$/.test(handle)) return handle;
  const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const data = await apiGet("channels", {
    part: "id",
    forHandle: cleanHandle,
  });
  return data.items?.[0]?.id ?? null;
}

export async function fetchChannelSnapshot(
  channelId: string,
): Promise<YoutubeChannelSnapshot | null> {
  const data = await apiGet("channels", {
    part: "snippet,statistics,contentDetails",
    id: channelId,
  });
  const item = data.items?.[0];
  if (!item) return null;
  return {
    channelId,
    title: item.snippet?.title ?? "",
    // Si el canal oculta el número de suscriptores, followers = null (FUENTES_DE_DATOS.md).
    followers: item.statistics?.hiddenSubscriberCount
      ? null
      : Number(item.statistics?.subscriberCount ?? NaN) || null,
    description: item.snippet?.description ?? "",
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? null,
    url: `https://www.youtube.com/channel/${channelId}`,
    country: item.snippet?.country ?? null,
  };
}

/**
 * FORMULA.md §3 — media de (me gusta + comentarios) ÷ vistas × 100, sobre las
 * últimas ENGAGEMENT_WINDOW_POSTS publicaciones con al menos
 * ENGAGEMENT_MIN_POST_AGE_HOURS horas de antigüedad. Si hay menos de
 * MIN_POSTS_FOR_ENGAGEMENT publicaciones válidas, devuelve null.
 */
export async function fetchEngagementRate(
  uploadsPlaylistId: string,
): Promise<number | null> {
  const playlist = await apiGet("playlistItems", {
    part: "contentDetails",
    playlistId: uploadsPlaylistId,
    maxResults: "25",
  });
  const videoIds: string[] = (playlist.items ?? [])
    .map((i: any) => i.contentDetails?.videoId)
    .filter(Boolean);
  if (videoIds.length === 0) return null;

  const videos = await apiGet("videos", {
    part: "snippet,statistics",
    id: videoIds.join(","),
  });

  const now = Date.now();
  const minAgeMs = ENGAGEMENT_MIN_POST_AGE_HOURS * 60 * 60 * 1000;
  const eligible = (videos.items ?? [])
    .filter((v: any) => {
      const publishedAt = new Date(v.snippet?.publishedAt).getTime();
      return Number.isFinite(publishedAt) && now - publishedAt >= minAgeMs;
    })
    .slice(0, ENGAGEMENT_WINDOW_POSTS);

  if (eligible.length < MIN_POSTS_FOR_ENGAGEMENT) return null;

  const rates = eligible
    .map((v: any) => {
      const views = Number(v.statistics?.viewCount ?? 0);
      if (!views) return null;
      const likes = Number(v.statistics?.likeCount ?? 0);
      const comments = Number(v.statistics?.commentCount ?? 0);
      return ((likes + comments) / views) * 100;
    })
    .filter((r: number | null): r is number => r != null);

  if (rates.length < MIN_POSTS_FOR_ENGAGEMENT) return null;
  return rates.reduce((a: number, b: number) => a + b, 0) / rates.length;
}

/**
 * Búsqueda por país y tema para docs/DESCUBRIMIENTO.md (pipeline/discover.ts).
 * `search.list` cuesta 100 unidades: usar con moderación (pocas búsquedas por día).
 */
export async function searchChannels(
  query: string,
  regionCode: string,
  maxResults = 10,
): Promise<Array<{ channelId: string; title: string }>> {
  const data = await apiGet("search", {
    part: "snippet",
    type: "channel",
    q: query,
    regionCode,
    maxResults: String(maxResults),
  });
  return (data.items ?? []).map((i: any) => ({
    channelId: i.snippet?.channelId ?? i.id?.channelId,
    title: i.snippet?.title ?? "",
  }));
}
