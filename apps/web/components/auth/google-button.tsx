"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { env } from "@/lib/env";

export function GoogleButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED) return null;

  async function signInWithGoogle() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/aceitar-termos",
        newUserCallbackURL: "/aceitar-termos",
        errorCallbackURL: "/entrar?social=erro",
      });
      if (result.error) setError("Não foi possível iniciar o login com Google.");
    } catch {
      setError("Não foi possível iniciar o login com Google.");
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
        Continuar com Google
      </Button>
      {error ? (
        <p role="alert" className="text-center text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
