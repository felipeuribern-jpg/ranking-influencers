// npm run import-manual -- docs/REVISION_MANUAL_REDES.csv "Nombre de quien revisó" [--dry-run]
// Lee las columnas instagram_actual y tiktok_actual del CSV (cifras vistas a mano en el
// perfil público) y las agrega a data/manual.json con fecha de hoy. No hace scraping.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const [csvPath, reviewer, ...flags] = process.argv.slice(2);
if (!csvPath || !reviewer) {
  console.error('Uso: npm run import-manual -- <archivo.csv> "<quién revisó>" [--dry-run]');
  process.exit(1);
}
const dryRun = flags.includes("--dry-run");

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const lines = readFileSync(csvPath, "utf8").split(/\r?\n/).filter((l) => l.trim());
const header = parseCsvLine(lines[0]);
const col = (name: string) => header.indexOf(name);
const need = ["id", "instagram_actual", "tiktok_actual"].map((n) => [n, col(n)] as const);
for (const [n, i] of need) if (i < 0) throw new Error(`Falta la columna "${n}" en el CSV`);

const manualPath = join(root, "data/manual.json");
const manual = JSON.parse(readFileSync(manualPath, "utf8")) as {
  version: number;
  entries: { id: string; platform: string; followers: number; source: string; date: string }[];
};
const known = new Set(
  (JSON.parse(readFileSync(join(root, "data/influencers.json"), "utf8")) as { influencers: { id: string }[] })
    .influencers.map((i) => i.id),
);
const today = new Date().toISOString().slice(0, 10);

let added = 0;
for (const line of lines.slice(1)) {
  const cells = parseCsvLine(line);
  const id = cells[col("id")];
  if (!known.has(id)) {
    console.warn(`id desconocido, se omite: ${id}`);
    continue;
  }
  for (const platform of ["instagram", "tiktok"] as const) {
    const raw = cells[col(`${platform}_actual`)]?.replace(/[.\s]/g, "");
    if (!raw) continue;
    const followers = Number(raw);
    if (!Number.isInteger(followers) || followers <= 0) {
      console.warn(`${id} ${platform}: cifra inválida "${raw}", se omite`);
      continue;
    }
    manual.entries.push({
      id,
      platform,
      followers,
      source: `Revisión manual del perfil público por ${reviewer}`,
      date: today,
    });
    added++;
  }
}

console.log(`${added} cifras ${dryRun ? "(simulación, no se escribió nada)" : "agregadas a data/manual.json"}.`);
if (!dryRun) writeFileSync(manualPath, JSON.stringify(manual, null, 2) + "\n");
