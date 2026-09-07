import { locale as rootLocale } from "next/root-params";
import { notFound } from "next/navigation";
import { english } from "./server-messages";
import { isLocale, localePath } from "./routing";
import { createTranslator } from "./translate";

export async function getI18n() {
  const locale = await rootLocale();
  if (!isLocale(locale)) notFound();
  return {
    locale,
    t: createTranslator(locale, english),
    href: (path: string) => localePath(path, locale),
  };
}
