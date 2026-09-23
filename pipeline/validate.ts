// npm run validate — falla si falta una traducción, un país inválido o un campo
// obligatorio. No modifica nada, solo lee y reporta.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { PLATFORMS } from "./config.js";
import { siteConfig } from "../site.config.js";

const root = join(import.meta.dirname, "..");
const errors: string[] = [];

function readJson(relPath: string): unknown {
  try {
    return JSON.parse(readFileSync(join(root, relPath), "utf8"));
  } catch (e) {
    errors.push(`${relPath}: no se pudo leer/parsear (${(e as Error).message})`);
    return null;
  }
}

function isValidCountryCode(code: string): boolean {
  if (!/^[A-Z]{2}$/.test(code)) return false;
  try {
    const name = new Intl.DisplayNames(["en"], { type: "region" }).of(code);
    return !!name && name !== code;
  } catch {
    return false;
  }
}

// --- i18n: las 10 claves de es.json deben existir, idénticas, en cada idioma ---
function validateI18n(): void {
  const baseLang = siteConfig.defaultLanguage;
  const base = readJson(`i18n/${baseLang}.json`) as Record<string, string> | null;
  if (!base) return;
  const baseKeys = new Set(Object.keys(base));

  for (const lang of siteConfig.languages) {
    if (lang === baseLang) continue;
    const file = readJson(`i18n/${lang}.json`) as Record<string, string> | null;
    if (!file) {
      errors.push(`i18n/${lang}.json: falta el archivo`);
      continue;
    }
    const keys = new Set(Object.keys(file));
    for (const key of baseKeys) {
      if (!keys.has(key)) errors.push(`i18n/${lang}.json: falta la clave "${key}"`);
      else if (!String(file[key]).trim()) {
        errors.push(`i18n/${lang}.json: la clave "${key}" está vacía`);
      }
    }
    for (const key of keys) {
      if (!baseKeys.has(key)) {
        errors.push(`i18n/${lang}.json: clave "${key}" no existe en ${baseLang}.json`);
      }
    }
  }
}

// --- data/influencers.json ---
const translatedSchema = z.record(z.string(), z.string());

const influencerSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id debe ser kebab-case"),
  name: z.string().min(1),
  country: z.string(),
  topic: translatedSchema,
  about: translatedSchema,
  handles: z.object(
    Object.fromEntries(PLATFORMS.map((p) => [p, z.string().nullable()])) as Record<
      string,
      z.ZodTypeAny
    >,
  ),
  handlesVerified: z.boolean(),
  discoveredAuto: z.boolean().optional(),
  baseline: z.object({
    source: z.string().min(1),
    followers: z.record(z.string(), z.number().nonnegative()),
  }),
});

const influencersFileSchema = z.object({
  version: z.number(),
  influencers: z.array(influencerSchema),
});

function validateInfluencers(): void {
  const raw = readJson("data/influencers.json");
  if (!raw) return;
  const parsed = influencersFileSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`data/influencers.json ${issue.path.join(".")}: ${issue.message}`);
    }
    return;
  }

  const seenIds = new Set<string>();
  for (const person of parsed.data.influencers) {
    if (seenIds.has(person.id)) {
      errors.push(`data/influencers.json: id duplicado "${person.id}"`);
    }
    seenIds.add(person.id);

    if (!isValidCountryCode(person.country)) {
      errors.push(
        `data/influencers.json "${person.id}": país inválido "${person.country}"`,
      );
    }

    for (const lang of siteConfig.languages) {
      if (!person.topic[lang]?.trim()) {
        errors.push(`data/influencers.json "${person.id}": falta topic.${lang}`);
      }
      if (!person.about[lang]?.trim()) {
        errors.push(`data/influencers.json "${person.id}": falta about.${lang}`);
      }
    }

    const hasAnyHandleOrBaseline =
      Object.values(person.handles).some((h) => h != null) ||
      Object.keys(person.baseline.followers).length > 0;
    if (!hasAnyHandleOrBaseline) {
      errors.push(
        `data/influencers.json "${person.id}": no tiene ningún handle ni dato de baseline`,
      );
    }
  }
}

// --- data/manual.json ---
const manualEntrySchema = z.object({
  id: z.string().min(1),
  platform: z.enum(PLATFORMS as [string, ...string[]]),
  followers: z.number().nonnegative(),
  er: z.number().nullable().optional(),
  source: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha debe ser AAAA-MM-DD"),
});
const manualFileSchema = z.object({
  version: z.number(),
  entries: z.array(manualEntrySchema),
});

function validateManual(): void {
  const raw = readJson("data/manual.json");
  if (!raw) return;
  const parsed = manualFileSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`data/manual.json ${issue.path.join(".")}: ${issue.message}`);
    }
  }
}

// --- i18n/*.json huérfanos: archivo sin idioma declarado en site.config.ts ---
function validateNoOrphanI18nFiles(): void {
  const files = readdirSync(join(root, "i18n")).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const lang = file.replace(/\.json$/, "");
    if (!(siteConfig.languages as readonly string[]).includes(lang)) {
      errors.push(`i18n/${file}: idioma no declarado en site.config.ts`);
    }
  }
}

validateI18n();
validateInfluencers();
validateManual();
validateNoOrphanI18nFiles();

if (errors.length > 0) {
  console.error(`✗ ${errors.length} problema(s) de validación:\n`);
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
} else {
  console.log("✓ validate: todo en orden");
}
