import { NextResponse, type NextRequest } from "next/server";
import { localeFromPath, localePath, unlocalizedPath, publicPagePaths } from "@/lib/i18n/routing";
import { contentSignal, prefersMarkdown } from "@/lib/public-content";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const locale = localeFromPath(pathname);
  const internalPath = unlocalizedPath(pathname);
  const canonical = localePath(internalPath, locale);
  if (pathname !== canonical) {
    const target = new URL(request.url);
    target.pathname = canonical;
    return NextResponse.redirect(target, 308);
  }
  const target = new URL(request.url);
  const publicPage = publicPagePaths.includes(internalPath);
  const reactRequest =
    request.headers.has("rsc") ||
    request.headers.has("next-router-state-tree") ||
    request.headers.has("next-router-prefetch") ||
    request.nextUrl.searchParams.has("_rsc");
  if (
    publicPage &&
    ["GET", "HEAD"].includes(request.method) &&
    !reactRequest &&
    prefersMarkdown(request.headers.get("accept"))
  ) {
    target.pathname = `/api/public-markdown/${locale}/${internalPath === "/" ? "home" : internalPath.slice(1)}`;
    target.search = "";
    return NextResponse.rewrite(target);
  }
  target.pathname = `/${locale}${internalPath === "/" ? "" : internalPath}`;
  const response = NextResponse.rewrite(target);
  if (publicPage) {
    response.headers.set("Vary", "Accept");
    response.headers.set("Content-Signal", contentSignal);
    response.headers.set("Content-Language", locale);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next(?:/|$)|brand(?:/|$)|img(?:/|$)|favicon.ico$|robots.txt$|sitemap.xml$|llms.txt$).*)",
  ],
};
