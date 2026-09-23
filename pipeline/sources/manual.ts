import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ManualEntry, ManualFile } from "../types.js";
import type { Platform } from "../config.js";

/** data/manual.json — LinkedIn, Snapchat y cualquier respaldo cargado a mano. */
export function loadManualEntries(root: string): ManualEntry[] {
  const file = JSON.parse(
    readFileSync(join(root, "data/manual.json"), "utf8"),
  ) as ManualFile;
  return file.entries;
}

export function findManualEntry(
  entries: ManualEntry[],
  influencerId: string,
  platform: Platform,
): ManualEntry | null {
  return (
    entries.find((e) => e.id === influencerId && e.platform === platform) ?? null
  );
}
