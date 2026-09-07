import type { Metadata } from "next";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { GoogleButton } from "@/components/auth/google-button";
import { SessionEntry } from "@/components/auth/session-entry";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Criar conta", alternates: { canonical: "/cadastro" } };

export default function SignUpPage() {
  return (
    <AuthSplitLayout
      panelTitle="Isolamento por padrão"
      panelBody="Cada workspace é um tenant isolado por RLS no PostgreSQL. Sua conta não vê nem toca dados de outro workspace."
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
