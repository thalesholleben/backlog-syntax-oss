import Link from "next/link";
import type { ReactNode } from "react";
import { absoluteUrl } from "@/lib/site";

type LegalSection = {
  heading: string;
  content: ReactNode;
};

type LegalPageProps = {
  title: string;
  description: string;
  path: string;
  sections: readonly LegalSection[];
};

export function LegalPage({ title, description, path, sections }: LegalPageProps) {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: title },
    ],
  };

  return (
    <main id="conteudo" className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
      <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      <nav aria-label="Trilha de navegação" className="mb-8 text-sm text-muted">
        <Link
          href="/"
          className="underline decoration-line underline-offset-4 hover:text-foreground"
        >
          Início
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{title}</span>
      </nav>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted">
        Versão de lançamento · 5 de setembro de 2026
      </p>
      <h1 className="mt-3 font-display text-[clamp(2.5rem,8vw,5rem)] font-bold leading-[0.95] tracking-[-0.055em]">
        {title}
      </h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-muted">{description}</p>
      <aside className="mt-8 rounded-2xl border border-status-blocked bg-surface p-5 text-sm leading-6">
        Serviço operado pela Syntax Lab. Dúvidas, suporte e solicitações de privacidade:
        contato@syntaxlab.com.br. Esta versão é gratuita e não oferece SLA de disponibilidade.
      </aside>
      <div className="mt-12 space-y-12">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-2xl font-bold tracking-[-0.025em]">
              {section.heading}
            </h2>
            <div className="mt-4 space-y-4 leading-7 text-muted">{section.content}</div>
          </section>
        ))}
      </div>
      <p className="mt-14 border-t border-line pt-7 text-sm text-muted">
        Canonical desta página: <span className="break-all font-mono">{absoluteUrl(path)}</span>
      </p>
    </main>
  );
}
