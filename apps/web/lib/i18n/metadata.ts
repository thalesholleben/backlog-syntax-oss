import type { Metadata } from "next";
import { absoluteUrl, socialImage } from "@/lib/site";
import { localePath, publicPagePaths, unlocalizedPath, type Locale } from "./routing";

export function languageAlternates(path: string) {
  return {
    "pt-BR": absoluteUrl(localePath(path, "pt-BR")),
    en: absoluteUrl(localePath(path, "en")),
    "x-default": absoluteUrl(localePath(path, "pt-BR")),
  };
}

export function localizeMetadata(metadata: Metadata, locale: Locale): Metadata {
  const canonical = metadata.alternates?.canonical;
  const path = typeof canonical === "string" ? unlocalizedPath(canonical) : undefined;
  const publicPage = path !== undefined && publicPagePaths.includes(path);
  return {
    ...metadata,
    ...(path
      ? {
          alternates: {
            canonical: localePath(path, locale),
            languages: publicPage ? languageAlternates(path) : {},
          },
        }
      : {}),
    ...(metadata.openGraph
      ? {
          openGraph: {
            ...metadata.openGraph,
            locale: locale === "en" ? "en_US" : "pt_BR",
            alternateLocale: locale === "en" ? ["pt_BR"] : ["en_US"],
            ...(path ? { url: localePath(path, locale) } : {}),
            images: [
              {
                ...socialImage,
                url: locale === "en" ? "/brand/backlog-og-en.png" : socialImage.path,
                alt:
                  locale === "en"
                    ? "Backlog Syntax: tasks for people and AI agents"
                    : socialImage.alt,
              },
            ],
          },
        }
      : {}),
    ...(metadata.twitter
      ? {
          twitter: {
            ...metadata.twitter,
            images: [locale === "en" ? "/brand/backlog-og-en.png" : socialImage.path],
          },
        }
      : {}),
  };
}
