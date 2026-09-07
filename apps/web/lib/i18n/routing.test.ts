import { describe, expect, it } from "vitest";
import { localeFromPath, localePath, unlocalizedPath } from "./routing";
import { createTranslator } from "./translate";
import { english } from "./messages";
import { weekColumns, shortDay } from "@/lib/tasks/week";
import { pluralDays, formatDateTime } from "@/lib/backlog/view-model";

describe("localized navigation", () => {
  it.each([
    ["/", "/en"],
    ["/documentacao", "/en/docs"],
    [
      "/recuperar-senha/redefinir?token=fixture%2Btoken&next=%2Fw%2Facme#form",
      "/en/reset-password?token=fixture%2Btoken&next=%2Fw%2Facme#form",
    ],
    [
      "/consent?client_id=fixture&scope=read%20write",
      "/en/consent?client_id=fixture&scope=read%20write",
    ],
    ["/w/perfil/projetos/configuracoes", "/en/w/perfil/projects/configuracoes"],
    ["/w/settings/configuracoes/perfil", "/en/w/settings/settings/profile"],
    ["/w/acme/documentacao#api", "/en/w/acme/docs#api"],
  ])("round-trips %s without changing user slugs or query data", (pt, en) => {
    expect(localePath(pt, "en")).toBe(en);
    expect(localePath(en, "en")).toBe(en);
    expect(localePath(en, "pt-BR")).toBe(pt);
    expect(unlocalizedPath(en)).toBe(pt);
  });
  it("does not prefix external links, anchors or already localized paths twice", () => {
    expect(localePath("https://example.com/docs", "en")).toBe("https://example.com/docs");
    expect(localePath("#mcp", "en")).toBe("#mcp");
    expect(localePath("/pt-BR/entrar", "en")).toBe("/en/sign-in");
    expect(localeFromPath("/english")).toBe("pt-BR");
    expect(localeFromPath("/en/docs")).toBe("en");
  });
});

describe("English presentation", () => {
  it("substitutes values without translating task content or interpreting its placeholders", () => {
    const t = createTranslator("en", english);
    const title = "Aberto {0} <script>fixture</script>";
    expect(t("Excluir a tarefa {0}", { "0": title })).toBe(`Delete task: ${title}`);
    expect(createTranslator("pt-BR", english)("Entrar")).toBe("Entrar");
  });
  it("localizes dates while keeping the same Monday-based scheduling semantics", () => {
    const monday = new Date(2026, 8, 7);
    const en = weekColumns(monday, "en"),
      pt = weekColumns(monday);
    expect(en.map((column) => column.dates)).toEqual(pt.map((column) => column.dates));
    expect(en.map((column) => column.shortLabel)).toEqual([
      "MON",
      "TUE",
      "WED",
      "THU",
      "FRI",
      "SAT–SUN",
    ]);
    expect(pluralDays(1, "en")).toBe("1 day");
    expect(pluralDays(2, "en")).toBe("2 days");
    expect(shortDay("2026-09-07", "en")).toBe("09/07");
    expect(shortDay("2026-09-07")).toBe("07/09");
    expect(formatDateTime("invalid", "en")).toBe("no date");
  });
});
