import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/documentacao", "/privacidade", "/cookies", "/termos", "/transparencia"].map(
    (path) => ({
      url: absoluteUrl(path),
      changeFrequency: path === "/" || path === "/documentacao" ? "weekly" : "monthly",
      priority: path === "/" ? 1 : path === "/documentacao" ? 0.8 : 0.4,
    }),
  );
}
