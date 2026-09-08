"use client";

import { LayoutDashboard } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import Link from "@/lib/i18n/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ProductBrand } from "@/components/product-brand";
import { useSession } from "@/lib/auth-client";
import { site } from "@/lib/site";

export function SiteHeader() {
  const { t } = useI18n();
  // Navigation convenience only: the API still owns session validity and tenant access.
  // Marketing pages are static, so this resolves after hydration and the guest label is
  // what renders first and what a visitor without JavaScript keeps.
  const session = useSession();
  const signedIn = Boolean(session.data?.session && session.data.user);

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
            {/* One entry point for both flows. /entrar already sends a signed-in visitor to
                their workspace and offers account creation to everyone else, so the target
                stays the same and only the label follows the session. */}
            <Link
              href="/entrar"
              className="inline-flex min-h-12 items-center rounded-full bg-contrast px-4 py-3 text-sm font-bold text-contrast-foreground hover:opacity-85"
            >
              {signedIn ? (
                <>
                  {/* Decorative: the link already reads "Dashboard". */}
                  <LayoutDashboard aria-hidden="true" className="mr-2 size-4" />
                  Dashboard
                </>
              ) : (
                t("Entrar / Criar conta")
              )}
            </Link>
          </nav>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
