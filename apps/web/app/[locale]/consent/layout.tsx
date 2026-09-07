import { localizeMetadata } from "@/lib/i18n/metadata";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t, locale } = await getI18n();
  return localizeMetadata(
    {
      title: t("Autorizar agente"),
      robots: { index: false, follow: false },
      alternates: { canonical: null, languages: {} },
    },
    locale,
  );
}

export default function ConsentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
