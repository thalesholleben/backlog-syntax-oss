import Link from "next/link";
import { ProductBrand } from "@/components/product-brand";
import { site } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-background/95">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="font-display text-base font-bold tracking-[-0.03em]">
          <ProductBrand />
        </Link>
        <nav aria-label="Navegação principal" className="flex items-center gap-1 sm:gap-3">
          <a
            href="/#como-funciona"
            className="hidden min-h-12 items-center rounded-full px-3 py-3 text-sm font-semibold text-muted hover:text-foreground md:inline-flex"
          >
            Como funciona
          </a>
          <a
            href="/#arquitetura"
            className="hidden min-h-12 items-center rounded-full px-3 py-3 text-sm font-semibold text-muted hover:text-foreground sm:inline-flex"
          >
            Arquitetura
          </a>
          <Link
            href="/documentacao"
            className="hidden min-h-12 items-center rounded-full px-3 py-3 text-sm font-semibold text-muted hover:text-foreground md:inline-flex"
          >
            Documentação
          </Link>
          <a
            href={site.github}
            className="hidden min-h-12 items-center rounded-full px-3 py-3 text-sm font-semibold text-muted hover:text-foreground sm:inline-flex"
          >
            GitHub
          </a>
          <Link
            href="/entrar"
            className="inline-flex min-h-12 items-center rounded-full px-3 py-3 text-sm font-semibold text-muted hover:text-foreground"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="inline-flex min-h-12 items-center rounded-full bg-contrast px-4 py-3 text-sm font-bold text-contrast-foreground hover:opacity-85"
          >
            Criar conta
          </Link>
        </nav>
      </div>
    </header>
  );
}
