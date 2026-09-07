import { localizeMetadata } from "@/lib/i18n/metadata";
import { getI18n } from "@/lib/i18n/server";
import type { Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Public_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { site, siteUrl, socialImage } from "@/lib/site";
import { I18nProvider } from "@/lib/i18n/provider";
import { locales } from "@/lib/i18n/routing";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const bodyFont = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export async function generateMetadata() {
  const { t, locale } = await getI18n();
  return localizeMetadata(
    {
      metadataBase: siteUrl,
      title: {
        default: t("Backlog para agentes e pessoas | Backlog Syntax"),
        template: "%s | Backlog Syntax",
      },
      description: t(site.description),
      applicationName: site.name,
      authors: [{ name: site.author.name, url: site.author.profile }],
      creator: site.author.name,
      publisher: site.publisher.name,
      alternates: { canonical: "/" },
      openGraph: {
        type: "website",
        locale: "pt_BR",
        siteName: site.name,
        title: t("Backlog para agentes e pessoas | Backlog Syntax"),
        description: t(site.description),
        url: "/",
        images: [
          {
            url: socialImage.path,
            width: socialImage.width,
            height: socialImage.height,
            type: socialImage.type,
            alt: socialImage.alt,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: t("Backlog para agentes e pessoas | Backlog Syntax"),
        description: t(site.description),
        images: [socialImage.path],
      },
      robots: { index: true, follow: true },
      icons: {
        icon: [
          {
            url: "/brand/syntax-lab-black.png",
            type: "image/png",
            media: "(prefers-color-scheme: light)",
          },
          {
            url: "/brand/syntax-lab-white.png",
            type: "image/png",
            media: "(prefers-color-scheme: dark)",
          },
        ],
        apple: "/brand/syntax-lab-black.png",
      },
    },
    locale,
  );
}

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E9EAE6" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
  ],
};

/**
 * Roda antes da primeira pintura: sem isto a página nasce clara e pisca para o
 * escuro depois da hidratação. Também marca `data-js`, que é o que liga as
 * animações de revelação (sem script elas ficam desligadas e nada some da tela).
 */
const themeBootstrap = `try{var t=localStorage.getItem("bl-tema");if(t==="claro"||t==="escuro")document.documentElement.dataset.tema=t}catch(e){}document.documentElement.dataset.js="1";`;

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { t, locale } = await getI18n();

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constante literal, sem dado de usuário, e precisa correr antes da pintura */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <a
          href="#conteudo"
          className="sr-only z-50 rounded-md bg-accent px-4 py-3 text-accent-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          {t("Pular para o conteúdo")}
        </a>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
