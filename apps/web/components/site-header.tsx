"use client";

import { useI18n } from "@/lib/i18n/provider";
import Link from "@/lib/i18n/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ProductBrand } from "@/components/product-brand";
import { site } from "@/lib/site";

export function SiteHeader() {
  const { t } = useI18n();

  return (
    <header className="border-b border-line bg-background/95">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
        <Link href="/" className="font-display text-base font-bold tracking-[-0.03em]">
          <ProductBrand />
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          <nav aria-label={t("Navegação principal")} className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/#como-funciona"
              className="hidden min-h-12 items-center rounded-full px-3 py-3 text-sm font-semibold text-muted hover:text-foreground md:inline-flex"
            >
              {t("Como funciona")}
            </Link>
            <Link
              href="/#arquitetura"
              className="hidden min-h-12 items-center rounded-full px-3 py-3 text-sm font-semibold text-muted hover:text-foreground sm:inline-flex"
            >
              {t("Arquitetura")}
            </Link>
            <Link
              href="/documentacao"
              className="hidden min-h-12 items-center rounded-full px-3 py-3 text-sm font-semibold text-muted hover:text-foreground md:inline-flex"
            >
              {t("Documentação")}
            </Link>
            <a
              href={site.github}
              className="hidden min-h-12 items-center rounded-full px-3 py-3 text-sm font-semibold text-muted hover:text-foreground sm:inline-flex"
            >
              GitHub
            </a>
            {/* One entry point for both flows. The sign-in page links to account creation,
                so merging the two buttons never strands someone without an account. */}
            <Link
              href="/entrar"
              className="inline-flex min-h-12 items-center rounded-full bg-contrast px-4 py-3 text-sm font-bold text-contrast-foreground hover:opacity-85"
            >
              {t("Entrar / Criar conta")}
            </Link>
          </nav>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
