"use client";

import Link from "@/lib/i18n/navigation";

import type { Translator } from "@/lib/i18n/translate";

import { useI18n } from "@/lib/i18n/provider";
import { useRouter } from "@/lib/i18n/navigation";

import { type FormEvent, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { legalNoticeVersion } from "@/lib/site";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";

const SignUpSchema = (t: Translator) =>
  z.object({
    name: z.string().trim().min(1, t("Informe seu nome.")),
    email: z.email(t("Informe um e-mail válido.")),
    password: z.string().min(12, t("A senha precisa ter pelo menos 12 caracteres.")),
    acceptedTerms: z.literal(true, { error: t("É preciso aceitar os termos de uso.") }),
    acceptedPrivacy: z.literal(true, {
      error: t("É preciso confirmar ciência do aviso de privacidade."),
    }),
  });

export function SignUpForm() {
  const { t } = useI18n();

  const router = useRouter();
  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    acceptedTerms: false,
    acceptedPrivacy: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = SignUpSchema(t).safeParse(values);
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
      const result = await authClient.signUp.email({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        termsAcceptedAt: new Date(),
        privacyNoticeAcceptedAt: new Date(),
        legalNoticeVersion,
      });
      if (result.error) {
        setFormError(t("Não foi possível criar a conta."));
        return;
      }
      await authClient.getSession({ query: { disableCookieCache: true } });
      router.push("/onboarding");
    } catch {
      setFormError(t("Não foi possível criar a conta agora. Tente de novo em instantes."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-[-0.03em]">{t("Criar conta")}</h1>
        <p className="mt-2 text-sm text-muted">{t("Leva menos de um minuto.")}</p>
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded-control border border-danger bg-danger/5 p-3 text-sm font-semibold text-danger"
        >
          {formError}
        </p>
      ) : null}

      <Field label={t("Nome")} error={fieldErrors.name}>
        {({ inputId, describedBy }) => (
          <Input
            id={inputId}
            autoComplete="name"
            required
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={describedBy}
            value={values.name}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          />
        )}
      </Field>

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

      <Field label={t("Senha")} hint="Pelo menos 12 caracteres." error={fieldErrors.password}>
        {({ inputId, describedBy }) => (
          <PasswordInput
            id={inputId}
            autoComplete="new-password"
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

      <div className="space-y-3">
        <Checkbox
          checked={values.acceptedTerms}
          onChange={(event) =>
            setValues((current) => ({ ...current, acceptedTerms: event.target.checked }))
          }
          label={
            <>
              {t("Li e aceito os")}{" "}
              <Link
                href="/termos"
                target="_blank"
                className="font-semibold underline decoration-line underline-offset-4"
                rel="noopener"
              >
                {t("Termos de uso")}
              </Link>
              .
            </>
          }
        />
        {fieldErrors.acceptedTerms ? (
          <p role="alert" className="text-sm font-semibold text-danger">
            {fieldErrors.acceptedTerms}
          </p>
        ) : null}

        <Checkbox
          checked={values.acceptedPrivacy}
          onChange={(event) =>
            setValues((current) => ({ ...current, acceptedPrivacy: event.target.checked }))
          }
          label={
            <>
              {t("Li o")}{" "}
              <Link
                href="/privacidade"
                target="_blank"
                className="font-semibold underline decoration-line underline-offset-4"
                rel="noopener"
              >
                {t("Aviso de privacidade")}
              </Link>
              .
            </>
          }
        />
        {fieldErrors.acceptedPrivacy ? (
          <p role="alert" className="text-sm font-semibold text-danger">
            {fieldErrors.acceptedPrivacy}
          </p>
        ) : null}
      </div>

      <Button type="submit" isLoading={isLoading} className="w-full">
        {t("Criar conta")}
      </Button>

      <p className="text-center text-sm text-muted">
        {t("Já tem conta?")}{" "}
        <Link
          href="/entrar"
          className="font-semibold text-foreground underline decoration-line underline-offset-4"
        >
          {t("Entrar")}
        </Link>
      </p>
    </form>
  );
}
