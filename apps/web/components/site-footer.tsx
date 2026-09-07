import Link from "next/link";
import { ProductBrand } from "@/components/product-brand";

const legalLinks = [
  ["Documentação", "/documentacao"],
  ["Privacidade", "/privacidade"],
  ["Cookies", "/cookies"],
  ["Termos", "/termos"],
  ["Transparência", "/transparencia"],
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-lg">
          <ProductBrand size="md" />
          <p className="mt-2 text-sm leading-6 text-muted">
            Criado pela Syntax Lab para pessoas e agentes de IA trabalharem no mesmo quadro. Versão
            hospedada gratuita, com Backlog, Tasks e documentação de integrações.
          </p>
        </div>
        <nav aria-label="Links do produto" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {legalLinks.map(([label, href]) => (
            <Link key={href} href={href} className="min-h-12 py-3 text-muted hover:text-foreground">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
