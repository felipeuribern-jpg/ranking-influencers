// Funciones puras que implementan docs/FORMULA.md. No hacen I/O.
import {
  ENGAGEMENT_RATIO_MAX,
  ENGAGEMENT_RATIO_MIN,
  GROWTH_CLAMP_MAX,
  GROWTH_CLAMP_MIN,
  POINTS_SCALE,
  PUBLIC_POINTS_SHARE_CAP,
  PUBLIC_POINTS_VOTE_SCALE,
  PLATFORMS,
  REACH_DIVISOR,
  STALE_AFTER_DAYS,
  type Platform,
} from "./config.js";

export function clamp(x: number, min: number, max: number): number {
  return Math.min(Math.max(x, min), max);
}

/** FORMULA.md §4 — alcance = log10(1 + followers / 10_000). */
export function reach(followers: number): number {
  return Math.log10(1 + followers / REACH_DIVISOR);
}

/**
 * FORMULA.md §4 — f_interac = sqrt(clamp(er / mediana_red, 0.25, 4)).
 * Sin `er` o sin mediana de la red, el factor es neutro (1).
 */
export function engagementFactor(
  er: number | null,
  medianEr: number | null,
): number {
  if (er == null || medianEr == null || medianEr <= 0) return 1;
  const ratio = er / medianEr;
  return Math.sqrt(clamp(ratio, ENGAGEMENT_RATIO_MIN, ENGAGEMENT_RATIO_MAX));
}

/**
 * FORMULA.md §4 — f_impulso = 1 + clamp(crec, -0.20, 0.50).
 * Sin dato de hace 30 días, el crecimiento se trata como 0 (factor neutro 1).
 */
export function growthFactor(
  followers: number,
  followers30: number | null,
): number {
  if (followers30 == null || followers30 <= 0) return 1;
  const crec = (followers - followers30) / followers30;
  return 1 + clamp(crec, GROWTH_CLAMP_MIN, GROWTH_CLAMP_MAX);
}

export interface PlatformSample {
  followers: number | null;
  followers30: number | null;
  er: number | null;
  /** Días desde la última actualización exitosa de esta red. */
  daysSinceUpdate?: number;
}

/**
 * FORMULA.md §4 — puntos_red = peso × 1000 × alcance × f_interac × f_impulso.
 * FORMULA.md §8 — una red sin actualizar hace más de STALE_AFTER_DAYS días aporta 0.
 */
export function platformPoints(
  weight: number,
  sample: PlatformSample,
  medianEr: number | null,
): number {
  const { followers, followers30, er, daysSinceUpdate } = sample;
  if (!followers || followers <= 0) return 0;
  if (daysSinceUpdate != null && daysSinceUpdate > STALE_AFTER_DAYS) return 0;
  return (
    weight *
    POINTS_SCALE *
    reach(followers) *
    engagementFactor(er, medianEr) *
    growthFactor(followers, followers30)
  );
}

/**
 * FORMULA.md §5 — puntos_publico = min(0.10 × puntos_redes, 800 × log10(1 + votos30)).
 */
export function publicPoints(networkPoints: number, votes30: number): number {
  return Math.min(
    PUBLIC_POINTS_SHARE_CAP * networkPoints,
    PUBLIC_POINTS_VOTE_SCALE * Math.log10(1 + Math.max(votes30, 0)),
  );
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Medianas de `er` por red, ignorando null. Ver FORMULA.md §4. */
export function medianEngagementByPlatform(
  people: Array<Partial<Record<Platform, PlatformSample>>>,
): Record<Platform, number | null> {
  const result = {} as Record<Platform, number | null>;
  for (const platform of PLATFORMS) {
    const ers = people
      .map((p) => p[platform]?.er)
      .filter((er): er is number => er != null);
    result[platform] = median(ers);
  }
  return result;
}

/** FORMULA.md §7 — red principal: más `followers`; empate, la de más puntos. */
export function mainPlatform(
  platforms: Partial<Record<Platform, { followers: number | null; points: number }>>,
): Platform | null {
  let best: Platform | null = null;
  let bestFollowers = -1;
  let bestPoints = -1;
  for (const platform of PLATFORMS) {
    const data = platforms[platform];
    const followers = data?.followers ?? 0;
    if (followers <= 0) continue;
    if (
      followers > bestFollowers ||
      (followers === bestFollowers && data!.points > bestPoints)
    ) {
      best = platform;
      bestFollowers = followers;
      bestPoints = data!.points;
    }
  }
  return best;
}

export interface RankableTotals {
  total: number;
  networkPoints: number;
  totalFollowers: number;
  name: string;
}

/** FORMULA.md §6 — orden y desempates. */
export function comparePeople(a: RankableTotals, b: RankableTotals): number {
  if (b.total !== a.total) return b.total - a.total;
  if (b.networkPoints !== a.networkPoints) return b.networkPoints - a.networkPoints;
  if (b.totalFollowers !== a.totalFollowers) return b.totalFollowers - a.totalFollowers;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}
