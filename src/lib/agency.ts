// Indicadores para agencias en la ficha de cada creador: alcance, interacción,
// crecimiento y confianza del dato. Son lecturas de los mismos datos del ranking;
// NO cambian el puntaje ni el orden (docs/FORMULA.md sigue siendo la fuente de verdad).
import type { Platform } from "../../pipeline/config.js";

export interface AgencyPlatform {
  followers: number | null;
  followers30: number | null;
  er: number | null;
  points: number;
  stale: boolean;
}

export type AgencyInput = Partial<Record<Platform, AgencyPlatform>>;
export type Medians = Partial<Record<Platform, number | null>>;
export type Level = "high" | "medium" | "low";
export type Confidence = "good" | "medium" | "partial";

export interface AgencyMetrics {
  reach: { index: number; followers: number; platform: Platform } | null;
  interaction: { index: number; ratio: number; level: Level; platforms: Platform[] } | null;
  growth: { index: number; value: number } | null;
  confidence: { level: Confidence; fresh: number };
}

const CORE: Platform[] = ["youtube", "tiktok", "instagram"];
const REACH_DIVISOR = 10_000;

const clamp = (x: number, min: number, max: number) => Math.min(Math.max(x, min), max);
const logReach = (followers: number) => Math.log10(1 + followers / REACH_DIVISOR);

function fresh(d: AgencyPlatform | undefined): d is AgencyPlatform {
  return Boolean(d && !d.stale && d.followers && d.followers > 0 && d.points > 0);
}

/** Mayor número de seguidores en una red vigente, de todo el ranking (escala del alcance). */
export function maxFreshFollowers(all: AgencyInput[]): number {
  let max = 0;
  for (const p of all) {
    for (const d of Object.values(p)) if (fresh(d)) max = Math.max(max, d.followers as number);
  }
  return max;
}

export function agencyMetrics(input: AgencyInput, medians: Medians, maxFollowers: number): AgencyMetrics {
  const entries = (Object.entries(input) as Array<[Platform, AgencyPlatform | undefined]>).filter(
    (e): e is [Platform, AgencyPlatform] => fresh(e[1]),
  );

  // Alcance: la red vigente más grande, en escala logarítmica respecto al máximo del ranking.
  let reach: AgencyMetrics["reach"] = null;
  const biggest = [...entries].sort((a, b) => (b[1].followers as number) - (a[1].followers as number))[0];
  if (biggest && maxFollowers > 0) {
    const followers = biggest[1].followers as number;
    reach = {
      index: Math.round(clamp((100 * logReach(followers)) / logReach(maxFollowers), 0, 100)),
      followers,
      platform: biggest[0],
    };
  }

  // Interacción: razón entre la tasa de la persona y la mediana de su red, ponderada por seguidores.
  const withEr = entries.filter(([p, d]) => d.er != null && (medians[p] ?? 0) > 0);
  let interaction: AgencyMetrics["interaction"] = null;
  if (withEr.length > 0) {
    const total = withEr.reduce((s, [, d]) => s + (d.followers as number), 0);
    const ratio = withEr.reduce((s, [p, d]) => s + ((d.er as number) / (medians[p] as number)) * (d.followers as number), 0) / total;
    const capped = clamp(ratio, 0.25, 4);
    interaction = {
      index: Math.round(clamp(50 + 50 * (Math.log(capped) / Math.log(4)), 0, 100)),
      ratio,
      level: ratio >= 1.25 ? "high" : ratio >= 0.8 ? "medium" : "low",
      platforms: withEr.map(([p]) => p),
    };
  }

  // Crecimiento a 30 días: solo con datos de hace 30 días de la propia red.
  const withHist = entries.filter(([, d]) => d.followers30 != null && d.followers30 > 0);
  let growth: AgencyMetrics["growth"] = null;
  if (withHist.length > 0) {
    const now = withHist.reduce((s, [, d]) => s + (d.followers as number), 0);
    const before = withHist.reduce((s, [, d]) => s + (d.followers30 as number), 0);
    const value = (now - before) / before;
    growth = { index: Math.round(clamp(((value + 0.2) / 0.7) * 100, 0, 100)), value };
  }

  // Confianza: cuántas de las 3 redes principales tienen dato vigente.
  const freshCore = CORE.filter((p) => fresh(input[p])).length;
  const level: Confidence = freshCore >= 3 ? "good" : freshCore === 2 ? "medium" : "partial";

  return { reach, interaction, growth, confidence: { level, fresh: freshCore } };
}
