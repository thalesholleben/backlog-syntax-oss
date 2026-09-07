"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type { ReactNode } from "react";

const sections = [
  ["perfil", "Perfil"],
  ["workspace", "Workspace"],
  ["membros", "Membros"],
  ["agentes", "Agentes e tokens"],
  ["mcp", "Conexão MCP"],
  ["privacidade", "Privacidade e LGPD"],
] as const;

export default function SettingsLayout({ children }: Readonly<{ children: ReactNode }>) {
  const params = useParams<{ workspaceSlug: string }>();
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
      <nav
        aria-label="Seções de configuração"
        className="bl-scroll mb-6 flex gap-1 overflow-x-auto lg:mb-0 lg:flex-col"
      >
        {sections.map(([slug, label]) => {
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
