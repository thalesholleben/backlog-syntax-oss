import { localizeMetadata } from "@/lib/i18n/metadata";
import { getI18n } from "@/lib/i18n/server";
import { Suspense } from "react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export async function generateMetadata() {
  const { t, locale } = await getI18n();
  return localizeMetadata({ title: t("Redefinir senha") }, locale);
}

export default async function ResetPasswordPage() {
  const { t } = await getI18n();

  return (
    <AuthSplitLayout
      panelTitle={t("Override humano sempre disponível")}
      panelBody={t(
        "Handoff e claim de agente nunca removem a capacidade de uma pessoa assumir, revisar ou reverter a tarefa.",
      )}
    >
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthSplitLayout>
  );
}
