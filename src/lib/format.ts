import type { LanguageCode } from "../../site.config";

/** «83,8 M» / «83.8M» / «8380万», según docs/IDIOMAS.md §4. */
export function formatCompactNumber(n: number, lang: LanguageCode): string {
  return new Intl.NumberFormat(lang, { notation: "compact", maximumFractionDigits: 1 }).format(
    n,
  );
}

export function formatNumber(n: number, lang: LanguageCode): string {
  return new Intl.NumberFormat(lang).format(Math.round(n));
}

export function formatDate(iso: string, lang: LanguageCode): string {
  return new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso),
  );
}

export function formatPercent(n: number, lang: LanguageCode): string {
  return new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(n) + " %";
}

export function formatSignedPercent(n: number, lang: LanguageCode): string {
  return new Intl.NumberFormat(lang, { maximumFractionDigits: 1, signDisplay: "always" }).format(
    n * 100,
  ) + " %";
}
