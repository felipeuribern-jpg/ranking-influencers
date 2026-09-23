import type { LanguageCode } from "../../site.config";

/** 🇲🇽 a partir de "MX". Intl.DisplayNames no traduce el nombre: usa esta función,
 * no escribas nombres de países a mano (docs/IDIOMAS.md §3). */
export function flagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function countryName(countryCode: string, lang: LanguageCode): string {
  try {
    return (
      new Intl.DisplayNames([lang], { type: "region" }).of(countryCode) ?? countryCode
    );
  } catch {
    return countryCode;
  }
}
