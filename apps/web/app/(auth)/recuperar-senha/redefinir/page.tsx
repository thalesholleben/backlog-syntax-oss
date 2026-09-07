import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Redefinir senha" };

export default function ResetPasswordPage() {
  return (
    <AuthSplitLayout
      panelTitle="Override humano sempre disponível"
      panelBody="Handoff e claim de agente nunca removem a capacidade de uma pessoa assumir, revisar ou reverter a tarefa."
    >
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthSplitLayout>
  );
}
