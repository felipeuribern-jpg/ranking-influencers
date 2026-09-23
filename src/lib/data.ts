import influencersFile from "../../data/influencers.json";
import rankingFile from "../../data/ranking.json";
import type { LanguageCode } from "../../site.config";
import type { InfluencersFile, PersonOutput, RankingOutput } from "../../pipeline/types.js";

const influencers = (influencersFile as InfluencersFile).influencers;
const ranking = rankingFile as RankingOutput;

export interface Person extends PersonOutput {
  name: string;
  country: string;
  topic: Record<string, string>;
  about: Record<string, string>;
  handles: Record<string, string | null>;
}

const influencersById = new Map(influencers.map((p) => [p.id, p]));

// data/ranking.json ya viene ordenado por rank ascendente (pipeline/run.ts).
export const people: Person[] = ranking.people
  .map((scored) => {
    const profile = influencersById.get(scored.id);
    if (!profile) return null;
    return {
      ...scored,
      name: profile.name,
      country: profile.country,
      topic: profile.topic,
      about: profile.about,
      handles: profile.handles,
    };
  })
  .filter((p): p is Person => p !== null);

export const rankingMeta = { generatedAt: ranking.generatedAt, medians: ranking.medians };

export function getPersonById(id: string): Person | undefined {
  return people.find((p) => p.id === id);
}

export function getCountries(): string[] {
  return [...new Set(people.map((p) => p.country))].sort();
}

export function getCountryTop(countryCode: string, limit = 10): Person[] {
  return people.filter((p) => p.country === countryCode).slice(0, limit);
}

export function getTopics(lang: LanguageCode): string[] {
  return [...new Set(people.map((p) => p.topic[lang] ?? p.topic.es).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, lang),
  );
}

export type MovementInfo =
  | { kind: "new" }
  | { kind: "same" }
  | { kind: "up"; diff: number }
  | { kind: "down"; diff: number };

const historyModules = import.meta.glob<RankingOutput>("../../data/history/*.json", {
  eager: true,
  import: "default",
});

export interface HistoryPoint {
  date: string;
  total: number;
}

/** Serie de puntos totales de una persona, para el gráfico de evolución del perfil. */
export function getHistorySeries(id: string, days = 90): HistoryPoint[] {
  const entries = Object.entries(historyModules)
    .map(([path, file]) => {
      const date = path.match(/(\d{4}-\d{2}-\d{2})\.json$/)?.[1];
      const person = file.people.find((p) => p.id === id);
      return date && person ? { date, total: person.total } : null;
    })
    .filter((e): e is HistoryPoint => e !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
  return entries.slice(-days);
}

export function movement(rank: number, rankPrev: number | null): MovementInfo {
  if (rankPrev == null) return { kind: "new" };
  const diff = rankPrev - rank;
  if (diff > 0) return { kind: "up", diff };
  if (diff < 0) return { kind: "down", diff: -diff };
  return { kind: "same" };
}
