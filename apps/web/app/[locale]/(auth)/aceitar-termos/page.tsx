import { localizeMetadata } from "@/lib/i18n/metadata";
import { getI18n } from "@/lib/i18n/server";
import { LegalAcceptanceForm } from "@/components/auth/legal-acceptance-form";

export async function generateMetadata() {
  const { t, locale } = await getI18n();
  return localizeMetadata({ title: t("Confirmar termos"), robots: { index: false } }, locale);
}

export default function LegalAcceptancePage() {
  return <LegalAcceptanceForm />;
}
