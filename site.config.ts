// Fuente única de verdad para el texto de marca. No escribas brandName/domain/tagline
// a mano en ningún otro archivo del sitio: impórtalos siempre desde aquí.
export const siteConfig = {
  brandName: "Fykin",
  domain: "fykin.com",
  tagline: {
    es: "Las personas más influyentes en redes sociales, por país y en el mundo.",
  },
  languages: [
    "es",
    "en",
    "pt",
    "fr",
    "de",
    "ru",
    "ar",
    "hi",
    "zh",
    "ja",
  ] as const,
  defaultLanguage: "es" as const,
  rtlLanguages: ["ar"] as const,
  defaultCountry: "MX",
} as const;

export type LanguageCode = (typeof siteConfig.languages)[number];

export function isRtl(lang: string): boolean {
  return (siteConfig.rtlLanguages as readonly string[]).includes(lang);
}
