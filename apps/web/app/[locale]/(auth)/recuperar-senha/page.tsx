import { localizeMetadata } from "@/lib/i18n/metadata";
import { getI18n } from "@/lib/i18n/server";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export async function generateMetadata() {
  const { t, locale } = await getI18n();
  return localizeMetadata({ title: t("Recuperar senha") }, locale);
}

export default async function ForgotPasswordPage() {
  const { t } = await getI18n();

  return (
    <AuthSplitLayout
      panelTitle={t("Concorrência sem perder trabalho")}
      panelBody={t(
        "Toda tarefa tem versão. Escritas com base desatualizada voltam com conflito estruturado, nunca com last-write-wins silencioso.",
      )}
    >
      <ForgotPasswordForm />
    </AuthSplitLayout>
  );
}
