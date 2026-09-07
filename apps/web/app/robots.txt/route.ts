import { absoluteUrl } from "@/lib/site";
import { contentSignal, privateCrawlerPaths } from "@/lib/public-content";

export const dynamic = "force-static";

export function GET() {
  const body = [
    "# Content Signals express usage preferences: https://contentsignals.org/",
    "# They do not change the source code's MIT license or authorize access to private data.",
    "User-agent: *",
    `Content-Signal: ${contentSignal}`,
    "Allow: /",
    ...privateCrawlerPaths().map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
