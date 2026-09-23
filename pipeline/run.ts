// npm run pipeline [-- --dry-run] [-- --discover]
// Orquesta la actualización diaria completa (docs/ARQUITECTURA.md → «Flujo diario»).
// Sin las credenciales de una red (YOUTUBE_API_KEY, META_ACCESS_TOKEN, Supabase...),
// esa red cae automáticamente a data/manual.json o a `baseline`, marcada `stale`
// según corresponda — nunca se inventa ni se pone a cero (CLAUDE.md regla #4).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PLATFORMS, PLATFORM_WEIGHTS, STALE_AFTER_DAYS, type Platform } from "./config.js";
import {
  comparePeople,
  mainPlatform,
  medianEngagementByPlatform,
  platformPoints,
  publicPoints,
} from "./score.js";
import { findManualEntry, loadManualEntries } from "./sources/manual.js";
import { fetchChannelSnapshot, fetchEngagementRate, resolveChannelId } from "./sources/youtube.js";
import { fetchBusinessDiscovery } from "./sources/instagram.js";
import { fetchPageSnapshot } from "./sources/facebook.js";
import { runDiscovery } from "./discover.js";
import type {
  Influencer,
  InfluencersFile,
  ManualEntry,
  PersonOutput,
  PlatformOutput,
  RankingOutput,
  ResolvedFile,
} from "./types.js";

const root = join(import.meta.dirname, "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const withDiscovery = args.includes("--discover");

// data/influencers.json todavía no tiene fecha propia de baseline: se documenta
// en docs/FUENTES_DE_DATOS.md como "seguidores de enero de 2026" (TreceBits).
const BASELINE_FETCHED_AT = "2026-01-15T00:00:00Z";

function readJson<T>(relPath: string): T {
  return JSON.parse(readFileSync(join(root, relPath), "utf8"));
}

function readJsonIfExists<T>(relPath: string): T | null {
  return existsSync(join(root, relPath)) ? readJson<T>(relPath) : null;
}

function todayISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromISO: string, toDate: Date): number {
  const from = new Date(fromISO).getTime();
  return Math.floor((toDate.getTime() - from) / (24 * 60 * 60 * 1000));
}

interface RawSnapshot {
  followers: number | null;
  er: number | null;
  url: string | null;
  source: string;
  fetchedAt: string;
}

async function fetchLiveSnapshot(
  person: Influencer,
  platform: Platform,
  resolved: ResolvedFile,
): Promise<RawSnapshot | null> {
  const handle = person.handles[platform];
  if (!handle) return null;

  try {
    if (platform === "youtube" && process.env.YOUTUBE_API_KEY) {
      let channelId = resolved.youtube[person.id];
      if (!channelId) {
        const resolvedId = await resolveChannelId(handle);
        if (!resolvedId) return null;
        channelId = resolvedId;
        resolved.youtube[person.id] = channelId;
      }
      const snapshot = await fetchChannelSnapshot(channelId);
      if (!snapshot) return null;
      const er = snapshot.uploadsPlaylistId
        ? await fetchEngagementRate(snapshot.uploadsPlaylistId)
        : null;
      return {
        followers: snapshot.followers,
        er,
        url: snapshot.url,
        source: "youtube-data-api-v3",
        fetchedAt: new Date().toISOString(),
      };
    }

    if (platform === "instagram" && process.env.META_ACCESS_TOKEN) {
      const snapshot = await fetchBusinessDiscovery(handle);
      if (!snapshot) return null;
      return {
        ...snapshot,
        source: "instagram-business-discovery",
        fetchedAt: new Date().toISOString(),
      };
    }

    if (platform === "facebook" && process.env.META_ACCESS_TOKEN) {
      const snapshot = await fetchPageSnapshot(handle);
      if (!snapshot) return null;
      return { ...snapshot, source: "facebook-graph-api", fetchedAt: new Date().toISOString() };
    }
  } catch (err) {
    console.warn(
      `[${person.id}] ${platform}: fallo al consultar la API (${(err as Error).message}). Se usa el último dato válido.`,
    );
  }
  // TikTok sin creador vinculado (Fase 7) y cualquier red sin credenciales
  // configuradas todavía caen aquí, al mismo camino que LinkedIn/Snapchat.
  return null;
}

function manualSnapshot(
  person: Influencer,
  platform: Platform,
  manualEntries: ManualEntry[],
): RawSnapshot | null {
  const manual = findManualEntry(manualEntries, person.id, platform);
  if (!manual) return null;
  return {
    followers: manual.followers,
    er: manual.er ?? null,
    url: null,
    source: manual.source,
    fetchedAt: new Date(manual.date).toISOString(),
  };
}

function baselineSnapshot(person: Influencer, platform: Platform): RawSnapshot | null {
  const followers = person.baseline.followers[platform];
  if (followers == null) return null;
  return {
    followers,
    er: null,
    url: null,
    source: person.baseline.source,
    fetchedAt: BASELINE_FETCHED_AT,
  };
}

async function fetchVotes30(): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return result; // Fase 5 sin conectar todavía: 0 votos para todos.

  const res = await fetch(`${url}/rest/v1/vote_counts_30d?select=influencer_id,votes30`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    console.warn(`No se pudo leer votos de Supabase (HTTP ${res.status}). Se usa 0 para todos.`);
    return result;
  }
  const rows: Array<{ influencer_id: string; votes30: number }> = await res.json();
  for (const row of rows) result.set(row.influencer_id, row.votes30);
  return result;
}

interface WorkingPerson {
  id: string;
  country: string;
  name: string;
  totalFollowers: number;
  total: number;
  networkPoints: number;
  publicPoints: number;
  votes30: number;
  mainPlatform: Platform | null;
  platforms: Partial<Record<Platform, PlatformOutput>>;
  rankPrev: number | null;
  countryRankPrev: number | null;
}

async function main(): Promise<void> {
  const influencersFile = readJson<InfluencersFile>("data/influencers.json");
  const manualEntries = loadManualEntries(root);
  const resolved =
    readJsonIfExists<ResolvedFile>("data/resolved.json") ?? { version: 1, youtube: {} };
  const previousRanking = readJsonIfExists<RankingOutput>("data/ranking.json");
  const previousById = new Map(previousRanking?.people.map((p) => [p.id, p]) ?? []);

  const today = new Date();
  const history30Date = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const history30 = readJsonIfExists<RankingOutput>(
    `data/history/${todayISODate(history30Date)}.json`,
  );
  const history30ById = new Map(history30?.people.map((p) => [p.id, p]) ?? []);

  // 1. Snapshot crudo por persona y red: vivo → manual → baseline.
  const snapshots = new Map<string, Partial<Record<Platform, RawSnapshot>>>();
  for (const person of influencersFile.influencers) {
    const perPlatform: Partial<Record<Platform, RawSnapshot>> = {};
    for (const platform of PLATFORMS) {
      const snapshot =
        (await fetchLiveSnapshot(person, platform, resolved)) ??
        manualSnapshot(person, platform, manualEntries) ??
        baselineSnapshot(person, platform);
      if (snapshot) perPlatform[platform] = snapshot;
    }
    snapshots.set(person.id, perPlatform);
  }

  // 2. Medianas de `er` por red, sobre todas las personas (FORMULA.md §4).
  const medians = medianEngagementByPlatform(
    influencersFile.influencers.map((p) => {
      const s = snapshots.get(p.id)!;
      const out: Partial<Record<Platform, { followers: number | null; followers30: number | null; er: number | null }>> = {};
      for (const platform of PLATFORMS) {
        const d = s[platform];
        if (d) out[platform] = { followers: d.followers, followers30: null, er: d.er };
      }
      return out;
    }),
  );

  const votes30ById = await fetchVotes30();

  // 3. Puntos por persona.
  const working: WorkingPerson[] = influencersFile.influencers.map((person) => {
    const snap = snapshots.get(person.id)!;
    const platforms: Partial<Record<Platform, PlatformOutput>> = {};
    const forMain: Partial<Record<Platform, { followers: number | null; points: number }>> = {};
    let networkPoints = 0;
    let totalFollowers = 0;

    for (const platform of PLATFORMS) {
      const d = snap[platform];
      if (!d) continue;
      const followers30 = history30ById.get(person.id)?.platforms[platform]?.followers ?? null;
      const daysSinceUpdate = daysBetween(d.fetchedAt, today);
      const points = platformPoints(
        PLATFORM_WEIGHTS[platform],
        { followers: d.followers, followers30, er: d.er, daysSinceUpdate },
        medians[platform] ?? null,
      );
      platforms[platform] = {
        followers: d.followers,
        followers30,
        er: d.er,
        points,
        stale: daysSinceUpdate > STALE_AFTER_DAYS,
        source: d.source,
        fetchedAt: d.fetchedAt,
        url: d.url,
      };
      networkPoints += points;
      totalFollowers += d.followers ?? 0;
      forMain[platform] = { followers: d.followers, points };
    }

    const votes30 = votes30ById.get(person.id) ?? 0;
    const pubPoints = publicPoints(networkPoints, votes30);

    return {
      id: person.id,
      country: person.country,
      name: person.name,
      totalFollowers,
      total: networkPoints + pubPoints,
      networkPoints,
      publicPoints: pubPoints,
      votes30,
      mainPlatform: mainPlatform(forMain),
      platforms,
      rankPrev: previousById.get(person.id)?.rank ?? null,
      countryRankPrev: previousById.get(person.id)?.countryRank ?? null,
    };
  });

  // 4. Orden mundial (FORMULA.md §6) y posición por país.
  working.sort((a, b) => comparePeople(a, b));
  const countryCounters = new Map<string, number>();
  const people: PersonOutput[] = working.map((p, idx) => {
    const countryRank = (countryCounters.get(p.country) ?? 0) + 1;
    countryCounters.set(p.country, countryRank);
    return {
      id: p.id,
      rank: idx + 1,
      rankPrev: p.rankPrev,
      countryRank,
      countryRankPrev: p.countryRankPrev,
      total: p.total,
      networkPoints: p.networkPoints,
      publicPoints: p.publicPoints,
      votes30: p.votes30,
      mainPlatform: p.mainPlatform,
      platforms: p.platforms,
    };
  });

  const output: RankingOutput = { generatedAt: today.toISOString(), medians, people };

  console.log(`Ranking calculado para ${people.length} personas.`);
  if (dryRun) {
    console.log("--dry-run: no se escribió ningún archivo.");
  } else {
    writeFileSync(join(root, "data/ranking.json"), JSON.stringify(output, null, 2) + "\n");
    mkdirSync(join(root, "data/history"), { recursive: true });
    writeFileSync(
      join(root, `data/history/${todayISODate(today)}.json`),
      JSON.stringify(output, null, 2) + "\n",
    );
    writeFileSync(join(root, "data/resolved.json"), JSON.stringify(resolved, null, 2) + "\n");
    console.log("Escrito data/ranking.json, data/history/ y data/resolved.json.");
  }

  if (withDiscovery && process.env.YOUTUBE_API_KEY) {
    const knownChannelIds = new Set(Object.values(resolved.youtube));
    const found = await runDiscovery(root, knownChannelIds);
    console.log(
      found.length > 0
        ? `Descubrimiento: ${found.length} candidato(s) nuevo(s) en data/candidates.json.`
        : "Descubrimiento: sin candidatos nuevos.",
    );
  }
}

main().catch((err) => {
  console.error("El pipeline falló:", err);
  process.exit(1);
});
