"use client";

import { useI18n } from "@/lib/i18n/provider";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { env } from "@/lib/env";

export function GoogleButton() {
  const { t, href } = useI18n();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED) return null;

  async function signInWithGoogle() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: href("/aceitar-termos"),
        newUserCallbackURL: href("/aceitar-termos"),
        errorCallbackURL: href("/entrar?social=erro"),
      });
      if (result.error) setError(t("Não foi possível iniciar o login com Google."));
    } catch {
      setError(t("Não foi possível iniciar o login com Google."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2 border-t border-line pt-5">
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        isLoading={isLoading}
        onClick={signInWithGoogle}
      >
        {t("Continuar com Google")}
      </Button>
      {error ? (
        <p role="alert" className="text-center text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
