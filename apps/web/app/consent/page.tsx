"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function ConsentForm() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scopes = (searchParams.get("scope") ?? "read")
    .split(" ")
    .map((scope) => scope.trim())
    .filter(Boolean);
  const clientId = searchParams.get("client_id") ?? "cliente MCP";

  async function decide(accept: boolean) {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authClient.oauth2.consent({ accept });
      if (result.error) {
        setError(result.error.message ?? "Não foi possível registrar sua decisão.");
        return;
      }
      const data = result.data as { redirect_uri?: string; url?: string } | null;
      const destination = data?.redirect_uri ?? data?.url;
      if (destination) window.location.assign(destination);
    } catch {
      setError("Não foi possível registrar sua decisão.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-12">
      <section className="w-full max-w-lg rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted">
          Autorização MCP
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.03em]">
          Autorizar acesso ao backlog
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          O cliente <strong className="text-foreground">{clientId}</strong> solicitou estes escopos.
          Autorize apenas clientes que você reconhece.
        </p>
        <ul className="mt-5 space-y-2">
          {scopes.map((scope) => (
            <li
              key={scope}
              className="rounded-control border border-line bg-panel px-3 py-2 font-mono text-sm"
            >
              {scope}
            </li>
          ))}
        </ul>
        {error ? <p className="mt-4 text-sm font-semibold text-danger">{error}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" disabled={isLoading} onClick={() => decide(false)}>
            Negar
          </Button>
          <Button isLoading={isLoading} onClick={() => decide(true)}>
            Autorizar
          </Button>
        </div>
      </section>
    </main>
  );
}

export default function ConsentPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center bg-background px-4 py-12">
          <p className="text-sm text-muted">Carregando autorização...</p>
        </main>
      }
    >
      <ConsentForm />
    </Suspense>
  );
}
