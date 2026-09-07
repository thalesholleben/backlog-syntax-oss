import { localizeMetadata } from "@/lib/i18n/metadata";
import { getI18n } from "@/lib/i18n/server";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { GoogleButton } from "@/components/auth/google-button";
import { SessionEntry } from "@/components/auth/session-entry";
import { SignInForm } from "@/components/auth/sign-in-form";

export async function generateMetadata() {
  const { t, locale } = await getI18n();
  return localizeMetadata({ title: t("Entrar"), alternates: { canonical: "/entrar" } }, locale);
}

export default async function SignInPage() {
  const { t } = await getI18n();

  return (
    <AuthSplitLayout
      panelTitle="Backlog agent-native"
      panelBody={t(
        "Um único backlog, versão a versão, com claim, evidência e handoff visíveis para pessoas e agentes.",
      )}
    >
      <SessionEntry>
        <div className="space-y-5">
          <SignInForm />
          <GoogleButton />
        </div>
      </SessionEntry>
    </AuthSplitLayout>
  );
}
