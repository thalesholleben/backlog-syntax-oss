import { localizeMetadata } from "@/lib/i18n/metadata";
import { getI18n } from "@/lib/i18n/server";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { GoogleButton } from "@/components/auth/google-button";
import { SessionEntry } from "@/components/auth/session-entry";
import { SignUpForm } from "@/components/auth/sign-up-form";

export async function generateMetadata() {
  const { t, locale } = await getI18n();
  return localizeMetadata(
    { title: t("Criar conta"), alternates: { canonical: "/cadastro" } },
    locale,
  );
}

export default async function SignUpPage() {
  const { t } = await getI18n();

  return (
    <AuthSplitLayout
      panelTitle={t("Isolamento por padrão")}
      panelBody={t(
        "Cada workspace é um tenant isolado por RLS no PostgreSQL. Sua conta não vê nem toca dados de outro workspace.",
      )}
    >
      <SessionEntry>
        <div className="space-y-5">
          <SignUpForm />
          <GoogleButton />
        </div>
      </SessionEntry>
    </AuthSplitLayout>
  );
}
