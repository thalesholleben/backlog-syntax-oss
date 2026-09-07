import { localizeMetadata } from "@/lib/i18n/metadata";
import type { Translator } from "@/lib/i18n/translate";
import { getI18n } from "@/lib/i18n/server";
import { DocumentationContent } from "@/components/documentation/documentation-content";
import { env } from "@/lib/env";
import { absoluteUrl, marketingMetadata, site } from "@/lib/site";

const description = (t: Translator) =>
  t(
    "Documentação pública do Backlog Syntax para integrar agentes e automações pela API REST, MCP remoto e WebMCP progressivo.",
  );

export async function generateMetadata() {
  const { t, locale } = await getI18n();
  return localizeMetadata(
    marketingMetadata({
      title: t("Documentação de API, MCP e WebMCP"),
      description: description(t),
      path: "/documentacao",
    }),
    locale,
  );
}

export default async function PublicDocumentationPage() {
  const { t, locale, href } = await getI18n();

  const organizationId = absoluteUrl("/#syntax-lab");
  const documentationUrl = absoluteUrl(href("/documentacao"));
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${documentationUrl}#article`,
        headline: t("Documentação de API, MCP e WebMCP"),
        description: description(t),
        url: documentationUrl,
        inLanguage: locale,
        author: { "@type": "Person", name: site.author.name, url: site.author.profile },
        publisher: { "@id": organizationId },
        about: [t("API REST"), "Model Context Protocol", "WebMCP"],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t("Início"), item: absoluteUrl(href("/")) },
          { "@type": "ListItem", position: 2, name: t("Documentação"), item: documentationUrl },
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
        workspaceName={t("documentação pública")}
        boxed
      />
    </main>
  );
}
