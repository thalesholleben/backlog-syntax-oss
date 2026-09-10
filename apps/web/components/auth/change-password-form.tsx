"use client";

import type { Translator } from "@/lib/i18n/translate";

import { useI18n } from "@/lib/i18n/provider";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";

const ChangePasswordSchema = (t: Translator) =>
  z
    .object({
      currentPassword: z.string().min(1, t("Informe a senha atual.")),
      newPassword: z.string().min(12, t("A senha precisa ter pelo menos 12 caracteres.")),
      confirmation: z.string(),
    })
    .refine((value) => value.newPassword !== value.currentPassword, {
      path: ["newPassword"],
      message: t("A nova senha precisa ser diferente da atual."),
    })
    .refine((value) => value.newPassword === value.confirmation, {
      path: ["confirmation"],
      message: t("A confirmação não confere com a nova senha."),
    });

/**
 * O texto cru do Better Auth nunca chega à tela: ele não é traduzido, muda entre versões e
 * às vezes descreve o banco em vez de descrever o que a pessoa fez.
 */
export function changePasswordServerMessage(code: string | undefined, t: Translator): string {
  if (code === "INVALID_PASSWORD") return t("A senha atual não confere.");
  if (code === "CREDENTIAL_ACCOUNT_NOT_FOUND") {
    return t("Esta conta entra por um provedor externo e não tem senha para trocar.");
  }
  return t("Não foi possível trocar a senha agora. Tente de novo em instantes.");
}

type Errors = { currentPassword?: string; newPassword?: string; confirmation?: string };

export function ChangePasswordForm() {
  const { t } = useI18n();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setDone(false);

    const parsed = ChangePasswordSchema(t).safeParse({
      currentPassword,
      newPassword,
      confirmation,
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "currentPassword" || field === "newPassword" || field === "confirmation") {
          next[field] ??= issue.message;
        }
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      const result = await authClient.changePassword({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        // Trocar senha costuma ser reação a suspeita de acesso indevido. Deixar as outras
        // sessões de pé anularia o gesto. A resposta traz cookie novo para esta sessão.
        revokeOtherSessions: true,
      });
      if (result.error) {
        setFormError(changePasswordServerMessage(result.error.code, t));
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setDone(true);
    } catch {
      setFormError(changePasswordServerMessage(undefined, t));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-sm space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold tracking-[-0.02em]">{t("Trocar a senha")}</h2>
        <p className="mt-1 text-sm text-muted">
          {t("Exige a senha atual e encerra suas outras sessões.")}
        </p>
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded-control border border-danger bg-danger/5 p-3 text-sm font-semibold text-danger"
        >
          {formError}
        </p>
      ) : null}

      {done ? (
        <p
          role="status"
          className="rounded-control border border-line bg-panel p-3 text-sm font-semibold"
        >
          {t("Senha alterada. Suas outras sessões foram encerradas.")}
        </p>
      ) : null}

      <Field label={t("Senha atual")} error={errors.currentPassword}>
        {({ inputId, describedBy }) => (
          <PasswordInput
            id={inputId}
            autoComplete="current-password"
            required
            aria-invalid={Boolean(errors.currentPassword)}
            aria-describedby={describedBy}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        )}
      </Field>

      <Field
        label={t("Nova senha")}
        hint={t("Pelo menos 12 caracteres.")}
        error={errors.newPassword}
      >
        {({ inputId, describedBy }) => (
          <PasswordInput
            id={inputId}
            autoComplete="new-password"
            required
            aria-invalid={Boolean(errors.newPassword)}
            aria-describedby={describedBy}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        )}
      </Field>

      <Field label={t("Confirmar a nova senha")} error={errors.confirmation}>
        {({ inputId, describedBy }) => (
          <PasswordInput
            id={inputId}
            autoComplete="new-password"
            required
            aria-invalid={Boolean(errors.confirmation)}
            aria-describedby={describedBy}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        )}
      </Field>

      <Button type="submit" isLoading={isLoading}>
        {t("Trocar a senha")}
      </Button>
    </form>
  );
}
