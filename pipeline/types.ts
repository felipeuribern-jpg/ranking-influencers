import type { Platform } from "./config.js";
import type { LanguageCode } from "../site.config.js";

export type Translated = Partial<Record<LanguageCode, string>>;

export interface InfluencerHandles extends Record<Platform, string | null> {}

export interface Influencer {
  id: string;
  name: string;
  country: string;
  topic: Translated;
  about: Translated;
  handles: InfluencerHandles;
  handlesVerified: boolean;
  /** true cuando el perfil fue agregado por pipeline/discover.ts, no a mano. */
  discoveredAuto?: boolean;
  baseline: {
    source: string;
    followers: Partial<Record<Platform, number>>;
  };
}

export interface InfluencersFile {
  version: number;
  influencers: Influencer[];
}

export interface ManualEntry {
  id: string;
  platform: Platform;
  followers: number;
  er?: number | null;
  source: string;
  date: string;
}

export interface ManualFile {
  version: number;
  entries: ManualEntry[];
}

export interface ResolvedFile {
  version: number;
  /** channelId de YouTube ya resueltos, por id de influencer. */
  youtube: Record<string, string>;
}

export interface PlatformOutput {
  followers: number | null;
  followers30: number | null;
  er: number | null;
  points: number;
  stale: boolean;
  source: string;
  fetchedAt: string;
  url: string | null;
}

export interface PersonOutput {
  id: string;
  rank: number;
  rankPrev: number | null;
  countryRank: number;
  countryRankPrev: number | null;
  total: number;
  networkPoints: number;
  publicPoints: number;
  votes30: number;
  mainPlatform: Platform | null;
  platforms: Partial<Record<Platform, PlatformOutput>>;
}

export interface RankingOutput {
  generatedAt: string;
  medians: Record<Platform, number | null>;
  people: PersonOutput[];
}
