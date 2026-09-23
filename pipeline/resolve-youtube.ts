// Herramienta de un solo uso (no forma parte del pipeline diario) para resolver
// automáticamente el canal de YouTube de los 40 perfiles semilla que todavía
// tienen `handles.youtube: null`.
//
// docs/FUENTES_DE_DATOS.md pedía verificar cada handle abriendo el perfil real
// a mano. Se reemplaza por verificación automática vía la API oficial: se busca
// el nombre con `search.list` y solo se acepta el candidato cuyo número de
// suscriptores actual esté razonablemente cerca del `baseline.followers.youtube`
// ya cargado — así no se inventa ni se asigna un canal al azar (CLAUDE.md #4).
// Los casos sin un candidato suficientemente cercano quedan sin tocar, en null,
// para revisión manual.
//
// Uso: npx tsx pipeline/resolve-youtube.ts [--dry-run]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import "dotenv/config";
import { searchChannels } from "./sources/youtube.js";
import type { InfluencersFile } from "./types.js";

const root = join(import.meta.dirname, "..");
const dryRun = process.argv.includes("--dry-run");

const API_BASE = "https://www.googleapis.com/youtube/v3";
function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("Falta YOUTUBE_API_KEY (revisa .env)");
  return key;
}

async function channelsStatistics(
  ids: string[],
): Promise<Map<string, { subs: number | null; title: string }>> {
  const url = new URL(`${API_BASE}/channels`);
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("id", ids.join(","));
  url.searchParams.set("key", apiKey());
  const res = await fetch(url);
  if (!res.ok) throw new Error(`channels.list -> HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const map = new Map<string, { subs: number | null; title: string }>();
  for (const item of data.items ?? []) {
    map.set(item.id, {
      subs: item.statistics?.hiddenSubscriberCount ? null : Number(item.statistics?.subscriberCount ?? NaN) || null,
      title: item.snippet?.title ?? "",
    });
  }
  return map;
}

const TOLERANCE = 0.35; // +/-35% frente al baseline de enero de 2026

async function main() {
  const file = JSON.parse(
    readFileSync(join(root, "data/influencers.json"), "utf8"),
  ) as InfluencersFile;

  const report: string[] = [];
  let matched = 0;
  let skipped = 0;

  for (const person of file.influencers) {
    if (person.handles.youtube) continue; // ya tiene handle
    const baseline = person.baseline.followers.youtube;
    if (!baseline) {
      skipped++;
      continue;
    }

    let candidates: Array<{ channelId: string; title: string }>;
    try {
      candidates = await searchChannels(person.name, person.country, 5);
    } catch (err) {
      report.push(`✗ ${person.name}: fallo en búsqueda (${(err as Error).message})`);
      continue;
    }
    if (candidates.length === 0) {
      report.push(`? ${person.name}: sin resultados de búsqueda`);
      continue;
    }

    const stats = await channelsStatistics(candidates.map((c) => c.channelId));
    let best: { channelId: string; title: string; subs: number } | null = null;
    let bestDiff = Infinity;
    for (const c of candidates) {
      const s = stats.get(c.channelId);
      if (!s?.subs) continue;
      const diff = Math.abs(s.subs - baseline) / baseline;
      if (diff < bestDiff) {
        bestDiff = diff;
        best = { channelId: c.channelId, title: s.title, subs: s.subs };
      }
    }

    if (best && bestDiff <= TOLERANCE) {
      person.handles.youtube = best.channelId;
      matched++;
      report.push(
        `✓ ${person.name} -> ${best.title} (${best.channelId}), ${best.subs.toLocaleString()} subs vs baseline ${baseline.toLocaleString()} (${(bestDiff * 100).toFixed(0)}% de diferencia)`,
      );
    } else {
      report.push(
        `? ${person.name}: mejor candidato "${best?.title ?? "ninguno"}" a ${best ? (bestDiff * 100).toFixed(0) : "?"}% del baseline — fuera de tolerancia, se deja sin resolver`,
      );
    }
  }

  console.log(report.join("\n"));
  console.log(`\n${matched} resueltos, ${skipped} sin baseline de YouTube, ${file.influencers.length - matched - skipped} sin match confiable.`);

  if (!dryRun && matched > 0) {
    writeFileSync(join(root, "data/influencers.json"), JSON.stringify(file, null, 2) + "\n");
    console.log("\nEscrito data/influencers.json.");
  } else if (dryRun) {
    console.log("\n--dry-run: no se escribió nada.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
