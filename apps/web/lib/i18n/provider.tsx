"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { english } from "./messages";
import { localePath, type Locale } from "./routing";
import { createTranslator } from "./translate";

const LocaleContext = createContext<Locale>("pt-BR");
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
export function useI18n() {
  const locale = useContext(LocaleContext);
  return useMemo(
    () => ({
      locale,
      t: createTranslator(locale, english),
      href: (path: string) => localePath(path, locale),
    }),
    [locale],
  );
}
