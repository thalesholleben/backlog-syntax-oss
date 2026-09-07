import type { Metadata } from "next";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ForgotPasswordPage() {
  return (
    <AuthSplitLayout
      panelTitle="Concorrência sem perder trabalho"
      panelBody="Toda tarefa tem versão. Escritas com base desatualizada voltam com conflito estruturado, nunca com last-write-wins silencioso."
    >
      <ForgotPasswordForm />
    </AuthSplitLayout>
  );
}
