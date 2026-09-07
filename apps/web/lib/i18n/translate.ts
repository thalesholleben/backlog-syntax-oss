import type { Locale } from "./routing";

export type Translator = (message: string, values?: Record<string, string | number>) => string;
export function createTranslator(
  locale: Locale,
  english: Readonly<Record<string, string>>,
): Translator {
  return (message, values) => {
    const translated = locale === "en" ? (english[message] ?? message) : message;
    return values
      ? translated.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match))
      : translated;
  };
}
