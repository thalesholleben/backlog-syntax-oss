import { localePath } from "@/lib/i18n/routing";

export const contentSignal = "search=yes, ai-input=yes, ai-train=no";
export const privatePagePaths = [
  "/entrar",
  "/cadastro",
  "/aceitar-termos",
  "/consent",
  "/recuperar-senha",
  "/recuperar-senha/redefinir",
  "/onboarding",
  "/w",
];

export function privateCrawlerPaths() {
  return [
    ...new Set([
      "/api/",
      "/pt-BR/",
      ...privatePagePaths,
      ...privatePagePaths.map((path) => localePath(path, "en")),
      // Internal route spellings are redirected, but remain excluded from crawling too.
      ...privatePagePaths.map((path) => `/en${path}`),
    ]),
  ];
}

/** Negotiate only an explicit, acceptable Markdown preference. Wildcards retain HTML. */
export function prefersMarkdown(accept: string | null): boolean {
  const entries = (accept ?? "").split(",").map((entry, index) => {
    const [media = "", ...parameters] = entry.trim().toLowerCase().split(";");
    const qParam = parameters.find((parameter) => parameter.trim().startsWith("q="));
    const raw = qParam?.trim().slice(2);
    const quality =
      raw === undefined ? 1 : /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(raw) ? Number(raw) : 0;
    return { media: media.trim(), quality, index };
  });
  const markdown = entries.find((entry) => entry.media === "text/markdown");
  if (!markdown || markdown.quality === 0) return false;
  const html =
    entries.find((entry) => entry.media === "text/html") ??
    entries.find((entry) => entry.media === "text/*") ??
    entries.find((entry) => entry.media === "*/*");
  if (!html) return true;
  return (
    markdown.quality > html.quality ||
    (markdown.quality === html.quality &&
      (html.media !== "text/html" || markdown.index < html.index))
  );
}

function decodeEntities(text: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity: string) => {
    if (!entity.startsWith("#")) return named[entity.toLowerCase()] ?? match;
    const value =
      entity[1]?.toLowerCase() === "x"
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
    return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : "";
  });
}

/** Convert our own SSR main element. This function never accepts a URL or fetches content. */
export function publicHtmlToMarkdown(html: string, canonical: string): string {
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1];
  if (!main) throw new Error("Public page has no main content");
  const codeBlocks: string[] = [];
  let content = main
    .replace(/<(script|style|nav)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_match, code: string) => {
      const decoded = decodeEntities(code.replace(/<[^>]*>/g, "")).trim();
      const fence = "`".repeat(
        Math.max(3, ...[...decoded.matchAll(/`+/g)].map((match) => match[0].length + 1)),
      );
      codeBlocks.push(`\n\n${fence}\n${decoded}\n${fence}\n\n`);
      return `\n\nBACKLOG_CODE_BLOCK_${codeBlocks.length - 1}\n\n`;
    })
    .replace(/<h([1-6])\b[^>]*>/gi, (_match, level: string) => `\n\n${"#".repeat(Number(level))} `)
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<(?:p|div|section|aside|header|details|summary|ul|ol)\b[^>]*>/gi, "\n\n")
    .replace(/<\/(?:p|div|section|aside|header|details|summary|ul|ol)>/gi, "\n\n")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(
      /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
      (_match, href: string, label: string) => {
        const text = decodeEntities(label.replace(/<[^>]*>/g, "")).trim();
        const destination = new URL(decodeEntities(href), canonical);
        return ["https:", "http:"].includes(destination.protocol) && text
          ? `[${text.replace(/([\[\]\\])/g, "\\$1")}](${destination.href.replace(/\)/g, "%29")})`
          : text;
      },
    )
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")
    .replace(/<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, "**$1**")
    .replace(/<[^>]*>/g, "");
  content = decodeEntities(content)
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  content = content.replace(
    /BACKLOG_CODE_BLOCK_(\d+)/g,
    (_match, index: string) => codeBlocks[Number(index)] ?? "",
  );
  return `${content}\n\nSource: ${canonical}\n`;
}
