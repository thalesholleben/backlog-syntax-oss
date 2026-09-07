import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { languageAlternates } from "@/lib/i18n/metadata";
import { locales, localePath, publicPagePaths } from "@/lib/i18n/routing";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPagePaths.flatMap((path) =>
    locales.map(
      (locale) =>
        ({
          url: absoluteUrl(localePath(path, locale)),
          alternates: { languages: languageAlternates(path) },
          changeFrequency: path === "/" || path === "/documentacao" ? "weekly" : "monthly",
          priority: path === "/" ? 1 : path === "/documentacao" ? 0.8 : 0.4,
        }) as const,
    ),
  );
}
