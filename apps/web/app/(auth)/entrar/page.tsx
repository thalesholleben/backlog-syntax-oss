import type { Metadata } from "next";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { GoogleButton } from "@/components/auth/google-button";
import { SessionEntry } from "@/components/auth/session-entry";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Entrar", alternates: { canonical: "/entrar" } };

export default function SignInPage() {
  return (
    <AuthSplitLayout
      panelTitle="Backlog agent-native"
      panelBody="Um único backlog, versão a versão, com claim, evidência e handoff visíveis para pessoas e agentes."
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
