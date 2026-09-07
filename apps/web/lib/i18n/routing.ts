export const locales = ["pt-BR", "en"] as const;
export type Locale = (typeof locales)[number];
export const isLocale = (value: string): value is Locale => value === "pt-BR" || value === "en";

const publicPaths = {
  "/": "/",
  "/documentacao": "/docs",
  "/privacidade": "/privacy",
  "/cookies": "/cookies",
  "/termos": "/terms",
  "/transparencia": "/transparency",
} as const;
export const publicPagePaths = Object.keys(publicPaths);
const routes: Record<string, string> = {
  ...publicPaths,
  "/entrar": "/sign-in",
  "/cadastro": "/sign-up",
  "/aceitar-termos": "/accept-terms",
  "/recuperar-senha": "/forgot-password",
  "/recuperar-senha/redefinir": "/reset-password",
};
const settings: Record<string, string> = {
  perfil: "profile",
  membros: "members",
  agentes: "agents",
  privacidade: "privacy",
  workspace: "workspace",
  mcp: "mcp",
};
const reverse = (map: Record<string, string>) =>
  Object.fromEntries(Object.entries(map).map(([a, b]) => [b, a]));
const reversedRoutes = reverse(routes);
const reversedSettings = reverse(settings);

function mapPath(path: string, english: boolean): string {
  const map = english ? routes : reversedRoutes;
  if (map[path]) return map[path];
  const parts = path.split("/");
  // Only route segments are translated. Workspace and project slugs are user data.
  if (parts[1] === "w" && parts[2]) {
    if (parts[3] === (english ? "configuracoes" : "settings")) {
      parts[3] = english ? "settings" : "configuracoes";
      if (parts[4]) parts[4] = (english ? settings : reversedSettings)[parts[4]] ?? parts[4];
    } else if (parts[3] === (english ? "projetos" : "projects")) {
      parts[3] = english ? "projects" : "projetos";
    } else if (parts[3] === (english ? "documentacao" : "docs")) {
      parts[3] = english ? "docs" : "documentacao";
    }
  }
  return parts.join("/");
}

export function localeFromPath(path: string): Locale {
  return /^\/en(?:\/|$|[?#])/.test(path) ? "en" : "pt-BR";
}

/** The unprefixed Portuguese path used by the existing application routes. */
export function unlocalizedPath(path: string): string {
  const match = /^([^?#]*)(.*)$/.exec(path);
  const pathname = match?.[1] || "/";
  const suffix = match?.[2] || "";
  if (/^\/en(?:\/|$)/.test(pathname)) return mapPath(pathname.slice(3) || "/", false) + suffix;
  if (/^\/pt-BR(?:\/|$)/.test(pathname)) return (pathname.slice(6) || "/") + suffix;
  return path;
}

export function localePath(path: string, locale: Locale): string {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return path;
  const normalized = unlocalizedPath(path);
  const match = /^([^?#]*)(.*)$/.exec(normalized);
  const pathname = match?.[1] || "/";
  const suffix = match?.[2] || "";
  return locale === "pt-BR"
    ? normalized
    : `/en${pathname === "/" ? "" : mapPath(pathname, true)}${suffix}`;
}
