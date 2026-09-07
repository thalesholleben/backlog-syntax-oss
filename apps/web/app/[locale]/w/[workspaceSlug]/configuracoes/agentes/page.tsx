"use client";

import { useI18n } from "@/lib/i18n/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { newIdempotencyKey } from "@/lib/api/client";
import {
  type CreatedServiceAccountToken,
  createServiceAccount,
  createServiceAccountToken,
  listServiceAccounts,
  revokeServiceAccount,
  type ServiceAccountScope,
} from "@/lib/api/service-accounts";
import { useActiveWorkspace } from "@/lib/use-active-workspace";

export default function ServiceAccountsSettingsPage() {
  const { t } = useI18n();

  const params = useParams<{ workspaceSlug: string }>();
  const { summary } = useActiveWorkspace(params.workspaceSlug);
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const query = useQuery({
    queryKey: ["service-accounts", summary?.id],
    queryFn: ({ signal }) => listServiceAccounts(summary?.id as string, signal),
    enabled: Boolean(summary),
  });

  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ServiceAccountScope[]>(["read"]);
  const [revealedToken, setRevealedToken] = useState<CreatedServiceAccountToken | null>(null);

  function toggleScope(scope: ServiceAccountScope, checked: boolean) {
    setScopes((current) =>
      checked
        ? current.includes(scope)
          ? current
          : [...current, scope]
        : current.filter((s) => s !== scope),
    );
  }

  const createMutation = useMutation({
    mutationFn: () => createServiceAccount(summary?.id as string, { name }, newIdempotencyKey()),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["service-accounts", summary?.id] });
    },
    onError: () => notify("error", t("Não foi possível criar o service account agora.")),
  });

  const revokeMutation = useMutation({
    mutationFn: (serviceAccountId: string) =>
      revokeServiceAccount(summary?.id as string, serviceAccountId, newIdempotencyKey()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service-accounts", summary?.id] }),
    onError: () => notify("error", t("Não foi possível revogar agora.")),
  });

  const tokenMutation = useMutation({
    mutationFn: (serviceAccountId: string) =>
      createServiceAccountToken(
        summary?.id as string,
        serviceAccountId,
        scopes,
        newIdempotencyKey(),
        t("Token principal"),
      ),
    onSuccess: (token) => setRevealedToken(token),
    onError: () => notify("error", t("Não foi possível gerar o token agora.")),
  });

  return (
    <section className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("Agentes e tokens")}
        </h1>
        <p className="mt-1 max-w-lg text-sm text-muted">
          {t(
            "Um service account é um principal técnico ligado a este workspace, nunca uma pessoa disfarçada. Escopos:",
          )}{" "}
          <code>read</code> {t("ou")} <code>write</code>
          {t(". Nenhum service account recebe")} <code>admin</code>.
        </p>
      </div>

      {query.isLoading ? <Skeleton className="h-32 w-full max-w-lg" /> : null}

      {query.data ? (
        <ul className="max-w-lg space-y-2">
          {query.data.map((account) => (
            <li key={account.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{account.name}</p>
                  <p className="font-mono text-xs text-muted">
                    {t("Escopos são definidos em cada token")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    isLoading={tokenMutation.isPending}
                    onClick={() => tokenMutation.mutate(account.id)}
                  >
                    {t("Gerar token")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Revogar ${account.name}`}
                    isLoading={revokeMutation.isPending}
                    onClick={() => revokeMutation.mutate(account.id)}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
          {query.data.length === 0 ? (
            <p className="text-sm text-muted">{t("Nenhum service account ainda.")}</p>
          ) : null}
        </ul>
      ) : null}

      <form
        className="max-w-lg space-y-4 rounded-card border border-line bg-surface p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) createMutation.mutate();
        }}
      >
        <h2 className="font-bold">{t("Novo service account")}</h2>
        <Field label={t("Nome")}>
          {({ inputId }) => (
            <Input
              id={inputId}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>
        <div className="space-y-2">
          <Checkbox
            label={t("Leitura (read)")}
            checked={scopes.includes("read")}
            onChange={(event) => toggleScope("read", event.target.checked)}
          />
          <Checkbox
            label={t("Escrita (write)")}
            checked={scopes.includes("write")}
            onChange={(event) => toggleScope("write", event.target.checked)}
          />
        </div>
        <Button type="submit" isLoading={createMutation.isPending}>
          {t("Criar service account")}
        </Button>
      </form>

      <Dialog
        open={Boolean(revealedToken)}
        onClose={() => setRevealedToken(null)}
        title={t("Token gerado")}
        variant="modal"
      >
        {revealedToken ? (
          <div className="space-y-4">
            <p className="rounded-2xl border border-status-blocked bg-panel p-4 text-sm leading-6">
              {t("Copie agora: este é o único momento em que o segredo completo é exibido.")}
            </p>
            <div className="flex items-center gap-2 rounded-control border border-line bg-panel p-3">
              <code className="flex-1 overflow-x-auto font-mono text-xs">
                {revealedToken.token}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(revealedToken.token);
                  notify("success", t("Token copiado."));
                }}
                aria-label={t("Copiar token")}
                className="flex size-10 shrink-0 items-center justify-center rounded-control hover:bg-surface"
              >
                <Copy aria-hidden="true" className="size-4" />
              </button>
            </div>
            <Button className="w-full" onClick={() => setRevealedToken(null)}>
              {t("Já copiei")}
            </Button>
          </div>
        ) : null}
      </Dialog>
    </section>
  );
}
