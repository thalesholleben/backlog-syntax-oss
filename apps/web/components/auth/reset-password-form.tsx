"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";

const ResetPasswordSchema = z.object({
  newPassword: z.string().min(12, "A senha precisa ter pelo menos 12 caracteres."),
});

export function ResetPasswordForm() {
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
        <h1 className="font-display text-3xl font-bold tracking-[-0.03em]">Link inválido</h1>
        <p className="text-sm leading-6 text-muted">
          Este link de redefinição está incompleto ou expirou. Peça um novo link.
        </p>
        <a
          href="/recuperar-senha"
          className="inline-block text-sm font-semibold underline decoration-line underline-offset-4"
        >
          Solicitar novo link
        </a>
      </div>
    );
  }

  const verifiedToken: string = token;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = ResetPasswordSchema.safeParse({ newPassword });
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
        setFormError("O link expirou ou já foi usado. Solicite um novo.");
        return;
      }
      router.push("/entrar");
    } catch {
      setFormError("Não foi possível redefinir a senha agora. Tente de novo em instantes.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-[-0.03em]">Nova senha</h1>
        <p className="mt-2 text-sm text-muted">Escolha uma senha nova para sua conta.</p>
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded-control border border-danger bg-danger/5 p-3 text-sm font-semibold text-danger"
        >
          {formError}
        </p>
      ) : null}

      <Field label="Nova senha" hint="Pelo menos 12 caracteres." error={fieldError}>
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
        Redefinir senha
      </Button>
    </form>
  );
}
