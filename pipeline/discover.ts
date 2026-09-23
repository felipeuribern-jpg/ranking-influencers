// Descubrimiento automático de candidatos nuevos — ampliación de alcance acordada
// con el usuario (docs/ESPECIFICACION.md marca esto "fuera de alcance en la v1" y
// dice que se agregan a mano; aquí se automatiza sin romper la regla de "nada de
// scraping" de CLAUDE.md). Ver docs/DESCUBRIMIENTO.md para el diseño completo.
//
// Este módulo NUNCA escribe directamente en data/influencers.json: los candidatos
// verificados se acumulan en data/candidates.json, a la espera de que alguien
// escriba `topic`/`about` en los 10 idiomas (texto que ninguna API oficial
// provee) antes de que pipeline/run.ts los pueda incluir en el ranking público.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fetchChannelSnapshot, searchChannels } from "./sources/youtube.js";
import { fetchBusinessDiscovery } from "./sources/instagram.js";
import { AUTO_DISCOVERY_MIN_FOLLOWERS } from "./config.js";
import type { InfluencerHandles } from "./types.js";

export interface DiscoveryQuery {
  countryCode: string;
  topicQuery: string;
}

// Un punto de partida razonable, uno por país base + un par de temas amplios.
// Se puede ampliar libremente: cada búsqueda cuesta 100 unidades de cuota de
// YouTube, así que conviene mantener la lista corta y rotarla en vez de crecerla
// sin límite.
export const DISCOVERY_QUERIES: DiscoveryQuery[] = [
  { countryCode: "MX", topicQuery: "influencer mexicano" },
  { countryCode: "ES", topicQuery: "creador de contenido español" },
  { countryCode: "AR", topicQuery: "influencer argentino" },
  { countryCode: "CO", topicQuery: "influencer colombiano" },
];

const SOCIAL_URL_PATTERNS: Record<keyof InfluencerHandles, RegExp> = {
  youtube: /(?:)/, // no aplica: youtube ya es la fuente
  tiktok: /tiktok\.com\/@([\w.-]+)/i,
  instagram: /instagram\.com\/([\w.-]+)/i,
  facebook: /facebook\.com\/([\w.-]+)/i,
  linkedin: /linkedin\.com\/(?:in|company)\/([\w-]+)/i,
  snapchat: /snapchat\.com\/add\/([\w.-]+)/i,
};

/**
 * Extrae handles de la descripción OFICIAL del canal de YouTube (texto que el
 * propio creador publicó vía la API, no HTML de un perfil ajeno).
 */
export function extractHandlesFromDescription(
  description: string,
): Partial<InfluencerHandles> {
  const handles: Partial<InfluencerHandles> = {};
  for (const [platform, pattern] of Object.entries(SOCIAL_URL_PATTERNS)) {
    if (platform === "youtube") continue;
    const match = description.match(pattern);
    if (match) handles[platform as keyof InfluencerHandles] = match[1];
  }
  return handles;
}

export interface Candidate {
  discoveredAt: string;
  youtubeChannelId: string;
  name: string;
  country: string;
  followers: { youtube: number | null; instagram?: number | null };
  handles: Partial<InfluencerHandles>;
  handlesVerified: false;
  needsContent: true; // topic/about en 10 idiomas pendientes
  youtubeDescriptionSnippet: string;
}

interface CandidatesFile {
  version: number;
  candidates: Candidate[];
}

function loadCandidatesFile(root: string): CandidatesFile {
  const path = join(root, "data/candidates.json");
  if (!existsSync(path)) return { version: 1, candidates: [] };
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * Busca candidatos nuevos, los verifica contra las APIs oficiales disponibles y
 * agrega los que superan AUTO_DISCOVERY_MIN_FOLLOWERS a data/candidates.json.
 * No toca data/influencers.json.
 */
export async function runDiscovery(
  root: string,
  knownChannelIds: Set<string>,
): Promise<Candidate[]> {
  const file = loadCandidatesFile(root);
  const alreadyQueued = new Set(file.candidates.map((c) => c.youtubeChannelId));
  const newCandidates: Candidate[] = [];

  for (const { countryCode, topicQuery } of DISCOVERY_QUERIES) {
    const results = await searchChannels(topicQuery, countryCode);
    for (const { channelId } of results) {
      if (knownChannelIds.has(channelId) || alreadyQueued.has(channelId)) continue;

      const snapshot = await fetchChannelSnapshot(channelId);
      if (!snapshot?.followers || snapshot.followers < AUTO_DISCOVERY_MIN_FOLLOWERS) {
        continue;
      }

      const handles = extractHandlesFromDescription(snapshot.description);

      // Si además hay un handle de Instagram en la descripción, se verifica de
      // inmediato con Business Discovery (uso soportado de esa API sobre cuentas
      // ajenas, no scraping). Si Instagram no está configurado todavía, se deja
      // el handle sin verificar para más adelante.
      let igFollowers: number | null | undefined;
      if (handles.instagram && process.env.META_ACCESS_TOKEN) {
        try {
          const ig = await fetchBusinessDiscovery(handles.instagram);
          igFollowers = ig?.followers ?? null;
        } catch {
          igFollowers = null;
        }
      }

      const candidate: Candidate = {
        discoveredAt: new Date().toISOString(),
        youtubeChannelId: channelId,
        name: snapshot.title,
        country: countryCode,
        followers: { youtube: snapshot.followers, instagram: igFollowers },
        handles,
        handlesVerified: false,
        needsContent: true,
        youtubeDescriptionSnippet: snapshot.description.slice(0, 280),
      };
      newCandidates.push(candidate);
      alreadyQueued.add(channelId);
    }
  }

  if (newCandidates.length > 0) {
    file.candidates.push(...newCandidates);
    writeFileSync(
      join(root, "data/candidates.json"),
      JSON.stringify(file, null, 2) + "\n",
    );
  }
  return newCandidates;
}
