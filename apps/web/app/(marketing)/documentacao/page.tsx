import { DocumentationContent } from "@/components/documentation/documentation-content";
import { env } from "@/lib/env";
import { absoluteUrl, marketingMetadata, site } from "@/lib/site";

const description =
  "Documentação pública do Backlog Syntax para integrar agentes e automações pela API REST, MCP remoto e WebMCP progressivo.";

export const metadata = marketingMetadata({
  title: "Documentação de API, MCP e WebMCP",
  description,
  path: "/documentacao",
});

export default function PublicDocumentationPage() {
  const organizationId = absoluteUrl("/#syntax-lab");
  const documentationUrl = absoluteUrl("/documentacao");
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${documentationUrl}#article`,
        headline: "Documentação de API, MCP e WebMCP",
        description,
        url: documentationUrl,
        inLanguage: "pt-BR",
        author: { "@type": "Person", name: site.author.name, url: site.author.profile },
        publisher: { "@id": organizationId },
        about: ["API REST", "Model Context Protocol", "WebMCP"],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Documentação", item: documentationUrl },
        ],
      },
    ],
  };

  return (
    <main id="conteudo">
      <script type="application/ld+json">
        {JSON.stringify(structuredData).replace(/</g, "\\u003c")}
      </script>
      <DocumentationContent
        apiUrl={env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}
        workspaceId="WORKSPACE_ID"
        workspaceName="documentação pública"
        boxed
      />
    </main>
  );
}
