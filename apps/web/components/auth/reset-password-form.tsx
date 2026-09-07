"use client";

import Link from "@/lib/i18n/navigation";

import type { Translator } from "@/lib/i18n/translate";

import { useI18n } from "@/lib/i18n/provider";
import { useRouter } from "@/lib/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";

const ResetPasswordSchema = (t: Translator) =>
  z.object({
    newPassword: z.string().min(12, t("A senha precisa ter pelo menos 12 caracteres.")),
  });

export function ResetPasswordForm() {
  const { t } = useI18n();

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!token) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-3xl font-bold tracking-[-0.03em]">{t("Link inválido")}</h1>
        <p className="text-sm leading-6 text-muted">
          {t("Este link de redefinição está incompleto ou expirou. Peça um novo link.")}
        </p>
        <Link
          href="/recuperar-senha"
          className="inline-block text-sm font-semibold underline decoration-line underline-offset-4"
        >
          {t("Solicitar novo link")}
        </Link>
      </div>
    );
  }

  const verifiedToken: string = token;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = ResetPasswordSchema(t).safeParse({ newPassword });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message);
      return;
    }
    setFieldError(undefined);
    setIsLoading(true);
    try {
      const result = await authClient.resetPassword({
        newPassword: parsed.data.newPassword,
        token: verifiedToken,
      });
      if (result.error) {
        setFormError(t("O link expirou ou já foi usado. Solicite um novo."));
        return;
      }
      router.push("/entrar");
    } catch {
      setFormError(t("Não foi possível redefinir a senha agora. Tente de novo em instantes."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-[-0.03em]">{t("Nova senha")}</h1>
        <p className="mt-2 text-sm text-muted">{t("Escolha uma senha nova para sua conta.")}</p>
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded-control border border-danger bg-danger/5 p-3 text-sm font-semibold text-danger"
        >
          {formError}
        </p>
      ) : null}

      <Field label={t("Nova senha")} hint="Pelo menos 12 caracteres." error={fieldError}>
        {({ inputId, describedBy }) => (
          <PasswordInput
            id={inputId}
            autoComplete="new-password"
            required
            aria-invalid={Boolean(fieldError)}
            aria-describedby={describedBy}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        )}
      </Field>

      <Button type="submit" isLoading={isLoading} className="w-full">
        {t("Redefinir senha")}
      </Button>
    </form>
  );
}
