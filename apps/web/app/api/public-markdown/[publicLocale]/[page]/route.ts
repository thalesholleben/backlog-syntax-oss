import { isLocale, localePath, publicPagePaths } from "@/lib/i18n/routing";
import { contentSignal, publicHtmlToMarkdown } from "@/lib/public-content";
import { absoluteUrl } from "@/lib/site";

export const runtime = "nodejs";

async function respond(
  request: Request,
  context: { params: Promise<{ publicLocale: string; page: string }> },
) {
  const { publicLocale: locale, page } = await context.params;
  const path = page === "home" ? "/" : `/${page}`;
  if (!isLocale(locale) || !publicPagePaths.includes(path)) {
    return new Response("Not found", {
      status: 404,
      headers: { "X-Robots-Tag": "noindex", "Cache-Control": "no-store" },
    });
  }
  const publicPath = localePath(path, locale);
  const canonical = absoluteUrl(publicPath);
  try {
    // Render only allowlisted public pages on this process's own listener. Never forward
    // incoming Host, cookies, authorization, query strings or crawler-supplied fetch URLs.
    const port = process.env.PORT ?? "3000";
    if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535)
      throw new Error("Invalid web port");
    const html = await fetch(`http://127.0.0.1:${port}${publicPath}`, {
      headers: { Accept: "text/html" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
    if (!html.ok || !html.headers.get("content-type")?.includes("text/html"))
      throw new Error("Public HTML unavailable");
    const source = await html.text();
    if (source.length > 2_000_000) throw new Error("Public HTML exceeds limit");
    const markdown = publicHtmlToMarkdown(source, canonical);
    return new Response(request.method === "HEAD" ? null : markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Language": locale,
        "Content-Signal": contentSignal,
        Vary: "Accept, RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch",
        "Cache-Control": "public, max-age=0, s-maxage=3600",
        Link: `<${canonical}>; rel="canonical"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(
      request.method === "HEAD" ? null : "Public content is temporarily unavailable.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          Vary: "Accept",
        },
      },
    );
  }
}

export const GET = respond;
export const HEAD = respond;
