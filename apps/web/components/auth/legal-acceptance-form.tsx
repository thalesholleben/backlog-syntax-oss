"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { authClient, useSession } from "@/lib/auth-client";

const LEGAL_NOTICE_VERSION = "2026-09-05";

export function LegalAcceptanceForm() {
  const router = useRouter();
  const session = useSession();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session.isPending && !session.data) router.replace("/entrar");
    const user = session.data?.user;
    if (user?.termsAcceptedAt && user.privacyNoticeAcceptedAt && user.legalNoticeVersion) {
      router.replace("/onboarding");
    }
  }, [session.data, session.isPending, router]);

  async function accept() {
    if (!acceptedTerms || !acceptedPrivacy) {
      setError("Confirme os Termos de uso e o Aviso de privacidade para continuar.");
      return;
    }
    setIsLoading(true);
    setError(null);
    const acceptedAt = new Date();
    try {
      const result = await authClient.updateUser({
        termsAcceptedAt: acceptedAt,
        privacyNoticeAcceptedAt: acceptedAt,
        legalNoticeVersion: LEGAL_NOTICE_VERSION,
      });
      if (result.error) {
        setError("Não foi possível registrar o aceite. Tente novamente.");
        return;
      }
      await authClient.getSession({ query: { disableCookieCache: true } });
      router.replace("/onboarding");
      router.refresh();
    } catch {
      setError("Não foi possível registrar o aceite. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-lg rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
      <h1 className="font-display text-3xl font-bold tracking-[-0.03em]">Antes de continuar</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        O login foi concluído. Registre sua concordância para acessar workspaces e dados do produto.
      </p>
      <div className="mt-6 space-y-4">
        <Checkbox
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
          label={
            <span>
              Li e aceito os{" "}
              <a className="font-semibold underline" href="/termos" target="_blank" rel="noopener">
                Termos de uso
              </a>
              .
            </span>
          }
        />
        <Checkbox
          checked={acceptedPrivacy}
          onChange={(event) => setAcceptedPrivacy(event.target.checked)}
          label={
            <span>
              Li o{" "}
              <a
                className="font-semibold underline"
                href="/privacidade"
                target="_blank"
                rel="noopener"
              >
                Aviso de privacidade
              </a>
              .
            </span>
          }
        />
      </div>
      {error ? (
        <p role="alert" className="mt-4 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
      <Button className="mt-6 w-full" isLoading={isLoading} onClick={accept}>
        Confirmar e continuar
      </Button>
    </section>
  );
}
