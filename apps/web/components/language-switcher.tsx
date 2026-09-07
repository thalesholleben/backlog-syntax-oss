"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { localePath } from "@/lib/i18n/routing";

export function LanguageSwitcher() {
  const pathname = usePathname();
  const { locale } = useI18n();
  return (
    <nav
      aria-label={locale === "en" ? "Language" : "Idioma"}
      // Below sm only the other language is rendered, as a single circle, because
      // the full pair pushes the English header onto a second line on small phones.
      className="inline-flex shrink-0 items-center rounded-full border-line bg-surface text-xs font-bold sm:border sm:p-0.5"
    >
      {(["pt-BR", "en"] as const).map((language) => {
        const isCurrent = language === locale;
        return (
          <a
            key={language}
            href={localePath(pathname, language)}
            hrefLang={language}
            lang={language}
            aria-current={isCurrent ? "page" : undefined}
            aria-label={language === "en" ? "English" : "Português do Brasil"}
            onClick={(event) => {
              // Preserve tokens, OAuth query parameters and in-page anchors only on the same origin.
              event.currentTarget.href =
                localePath(window.location.pathname, language) +
                window.location.search +
                window.location.hash;
            }}
            className={`min-h-10 min-w-10 items-center justify-center rounded-full px-2 ${
              isCurrent
                ? "hidden bg-accent text-accent-foreground sm:flex"
                : "flex border border-line text-muted hover:text-foreground sm:border-0"
            }`}
          >
            {language === "en" ? "EN" : "PT"}
          </a>
        );
      })}
    </nav>
  );
}
