import { siteConfig, type LanguageCode } from "../../site.config";

const dictionaries = import.meta.glob<Record<string, string>>("../../i18n/*.json", {
  eager: true,
  import: "default",
});

function dictionaryFor(lang: LanguageCode): Record<string, string> {
  const dict = dictionaries[`../../i18n/${lang}.json`];
  if (!dict) throw new Error(`Falta i18n/${lang}.json`);
  return dict;
}

export function translator(lang: LanguageCode) {
  const dict = dictionaryFor(lang);
  const fallback = dictionaryFor(siteConfig.defaultLanguage);
  return function t(key: string, params?: Record<string, string | number>): string {
    let template = dict[key] ?? fallback[key];
    if (template == null) {
      throw new Error(`Falta la clave i18n "${key}" en ${lang}`);
    }
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        template = template.replaceAll(`{${k}}`, String(v));
      }
    }
    return template;
  };
}

export type Translator = ReturnType<typeof translator>;
