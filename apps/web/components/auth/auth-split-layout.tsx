"use client";

import { useI18n } from "@/lib/i18n/provider";
import Link from "@/lib/i18n/navigation";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ProductBrand, SyntaxLabLogo } from "@/components/product-brand";
import { statusDotClass, statusLabel } from "@/lib/task-presentation";

const previewStatuses = ["open", "in_progress", "blocked", "done"] as const;

export function AuthSplitLayout({
  children,
  panelTitle,
  panelBody,
}: {
  children: ReactNode;
  panelTitle: string;
  panelBody: string;
}) {
  const { t } = useI18n();

  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-8 sm:py-10 lg:order-2 lg:border-l lg:border-line lg:px-16">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 font-display text-base font-bold"
          >
            <ProductBrand />
          </Link>
          <LanguageSwitcher />
        </div>
        <main id="conteudo" className="flex flex-1 items-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <footer className="flex items-center justify-between gap-4 border-t border-line pt-5">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-faint">
              {t("Um produto da")}
            </p>
            <p className="mt-1 text-xs text-muted">{t("Software, automação e IA em produção.")}</p>
          </div>
          <a
            href="https://syntaxlab.com.br"
            target="_blank"
            rel="noreferrer"
            aria-label={t("Conhecer a Syntax Lab")}
            className="rounded-control p-1.5 transition-opacity hover:opacity-65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <SyntaxLabLogo className="size-11" />
          </a>
        </footer>
      </div>

      <aside
        aria-hidden="true"
        className="relative hidden flex-col justify-between overflow-hidden bg-foreground px-16 py-16 text-background lg:order-1 lg:flex"
      >
        <div className="max-w-sm">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] opacity-60">
            {panelTitle}
          </p>
          <p className="mt-4 text-2xl leading-9 font-display font-bold tracking-[-0.02em]">
            {panelBody}
          </p>
        </div>

        <div className="w-full max-w-sm rounded-card border border-background/10 bg-background/5 p-5 shadow-pop backdrop-blur-sm">
          <div className="flex flex-wrap gap-3 border-b border-background/10 pb-4">
            {previewStatuses.map((status) => (
              <span
                key={status}
                className="inline-flex items-center gap-1.5 text-xs font-bold opacity-70"
              >
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${statusDotClass[status]}`}
                />
                {t(statusLabel[status])}
              </span>
            ))}
          </div>
          <div className="mt-4 space-y-2 font-mono text-xs leading-6 opacity-80">
            <p>{t("> pessoa define critérios de aceite")}</p>
            <p>{t("> agente faz claim com lease de 30min")}</p>
            <p>{t("> handoff registra evidência + versão")}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
