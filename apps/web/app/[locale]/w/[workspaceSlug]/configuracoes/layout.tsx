"use client";

import type { Translator } from "@/lib/i18n/translate";

import { useI18n } from "@/lib/i18n/provider";
import Link from "@/lib/i18n/navigation";
import { usePathname } from "@/lib/i18n/navigation";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

const sections = (t: Translator) =>
  [
    ["perfil", t("Perfil")],
    ["workspace", "Workspace"],
    ["membros", t("Membros")],
    ["agentes", t("Agentes e tokens")],
    ["mcp", t("Conexão MCP")],
    ["privacidade", t("Privacidade e LGPD")],
  ] as const;

export default function SettingsLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { t } = useI18n();

  const params = useParams<{ workspaceSlug: string }>();
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
      <nav
        aria-label={t("Seções de configuração")}
        className="bl-scroll mb-6 flex gap-1 overflow-x-auto lg:mb-0 lg:flex-col"
      >
        {sections(t).map(([slug, label]) => {
          const href = `/w/${params.workspaceSlug}/configuracoes/${slug}`;
          const active = pathname === href;
          return (
            <Link
              key={slug}
              href={href}
              className={`min-h-11 shrink-0 rounded-full px-4 py-2.5 text-sm font-bold lg:rounded-control ${
                active
                  ? "bg-foreground text-background"
                  : "text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div>{children}</div>
    </div>
  );
}
