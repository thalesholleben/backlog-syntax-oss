import { localizeMetadata } from "@/lib/i18n/metadata";
import { getI18n } from "@/lib/i18n/server";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers/app-providers";

export async function generateMetadata() {
  const { t, locale } = await getI18n();
  return localizeMetadata(
    {
      title: t("Configurar workspace"),
      robots: { index: false, follow: false },
      alternates: { canonical: null, languages: {} },
    },
    locale,
  );
}

export default function OnboardingLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AppProviders>{children}</AppProviders>;
}
