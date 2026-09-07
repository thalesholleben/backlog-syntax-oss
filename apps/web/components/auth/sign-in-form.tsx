"use client";

import Link from "@/lib/i18n/navigation";

import type { Translator } from "@/lib/i18n/translate";

import { useI18n } from "@/lib/i18n/provider";
import { useRouter } from "@/lib/i18n/navigation";

import { type FormEvent, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { listWorkspaces } from "@/lib/api/workspaces";

const SignInSchema = (t: Translator) =>
  z.object({
    email: z.email(t("Informe um e-mail válido.")),
    password: z.string().min(1, t("Informe sua senha.")),
  });

export function SignInForm() {
  const { t } = useI18n();

  const router = useRouter();
  const [values, setValues] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = SignInSchema(t).safeParse(values);
    if (!parsed.success) {
      setFieldErrors(
        Object.fromEntries(
          Object.entries(parsed.error.flatten().fieldErrors).map(([key, messages]) => [
            key,
            messages?.[0] ?? "",
          ]),
        ),
      );
      return;
    }
    setFieldErrors({});
    setIsLoading(true);
    try {
      const result = await authClient.signIn.email(parsed.data);
      if (result.error) {
        // Deliberately the same message for "unknown e-mail" and "wrong password" to avoid
        // user enumeration (security-checklist §2).
        setFormError(t("E-mail ou senha inválidos."));
        return;
      }
      await authClient.getSession({ query: { disableCookieCache: true } });
      const workspaces = await listWorkspaces().catch(() => []);
      router.push(workspaces[0] ? `/w/${workspaces[0].slug}` : "/onboarding");
    } catch {
      setFormError(t("Não foi possível entrar agora. Tente de novo em instantes."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-[-0.03em]">{t("Entrar")}</h1>
        <p className="mt-2 text-sm text-muted">{t("Acesse o backlog do seu workspace.")}</p>
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded-control border border-danger bg-danger/5 p-3 text-sm font-semibold text-danger"
        >
          {formError}
        </p>
      ) : null}

      <Field label={t("E-mail")} error={fieldErrors.email}>
        {({ inputId, describedBy }) => (
          <Input
            id={inputId}
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={describedBy}
            value={values.email}
            onChange={(event) =>
              setValues((current) => ({ ...current, email: event.target.value }))
            }
          />
        )}
      </Field>

      <Field label={t("Senha")} error={fieldErrors.password}>
        {({ inputId, describedBy }) => (
          <PasswordInput
            id={inputId}
            required
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={describedBy}
            value={values.password}
            onChange={(event) =>
              setValues((current) => ({ ...current, password: event.target.value }))
            }
          />
        )}
      </Field>

      <div className="flex justify-end text-sm">
        <Link
          href="/recuperar-senha"
          className="min-h-10 py-2 font-semibold text-muted hover:text-foreground"
        >
          {t("Esqueceu a senha?")}
        </Link>
      </div>

      <Button type="submit" isLoading={isLoading} className="w-full">
        {t("Entrar")}
      </Button>

      <p className="text-center text-sm text-muted">
        {t("Não tem conta?")}{" "}
        <Link
          href="/cadastro"
          className="font-semibold text-foreground underline decoration-line underline-offset-4"
        >
          {t("Criar conta")}
        </Link>
      </p>
    </form>
  );
}
