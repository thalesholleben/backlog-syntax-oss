import type { Metadata } from "next";

const defaultSiteUrl = "https://backlog.syntaxlab.com.br";

const configuredSiteUrl = process.env.PUBLIC_WEB_URL?.trim();

export const siteUrl = new URL(configuredSiteUrl || defaultSiteUrl);

export const site = {
  name: "Backlog Syntax",
  description:
    "Backlog open source e multi-tenant onde o agente de IA tem identidade própria, assume tarefa com prazo e deixa trilha. Interface, REST e MCP sobre o mesmo domínio, com self-host ou versão hospedada gratuita.",
  github: "https://github.com/thalesholleben/backlog-syntax-oss",
  author: {
    name: "Thales Gomes",
    profile: "https://github.com/thalesholleben",
  },
  publisher: {
    name: "Syntax Lab",
    url: "https://syntaxlab.com.br",
  },
} as const;

export const socialImage = {
  path: "/brand/backlog-og.png",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "Backlog Syntax: seu agente termina, o contexto fica.",
} as const;

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl).toString();
}

interface MarketingMetadataInput {
  title: string;
  description: string;
  path: string;
}

export function marketingMetadata({ title, description, path }: MarketingMetadataInput): Metadata {
  const images = [
    {
      url: absoluteUrl(socialImage.path),
      width: socialImage.width,
      height: socialImage.height,
      type: socialImage.type,
      alt: socialImage.alt,
    },
  ];

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: site.name,
      title,
      description,
      url: path,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl(socialImage.path)],
    },
  };
}
