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
      className="inline-flex shrink-0 items-center rounded-full border border-line bg-surface p-0.5 text-xs font-bold"
    >
      {(["pt-BR", "en"] as const).map((language) => (
        <a
          key={language}
          href={localePath(pathname, language)}
          hrefLang={language}
          lang={language}
          aria-current={language === locale ? "page" : undefined}
          aria-label={language === "en" ? "English" : "Português do Brasil"}
          onClick={(event) => {
            // Preserve tokens, OAuth query parameters and in-page anchors only on the same origin.
            event.currentTarget.href =
              localePath(window.location.pathname, language) +
              window.location.search +
              window.location.hash;
          }}
          className={`flex min-h-10 min-w-10 items-center justify-center rounded-full px-2 ${language === locale ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"}`}
        >
          {language === "en" ? "EN" : "PT"}
        </a>
      ))}
    </nav>
  );
}
