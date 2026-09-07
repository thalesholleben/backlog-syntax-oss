"use client";

import { useParams } from "next/navigation";
import { PrincipalBadge } from "@/components/ui/principal-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveWorkspace } from "@/lib/use-active-workspace";

export default function MembersSettingsPage() {
  const params = useParams<{ workspaceSlug: string }>();
  const { contextQuery } = useActiveWorkspace(params.workspaceSlug);
  const principal = contextQuery.data?.principal;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">Membros</h1>
        <p className="mt-1 text-sm text-muted">Pessoas com acesso a este workspace.</p>
      </div>

      {contextQuery.isLoading ? (
        <Skeleton className="h-16 w-full max-w-sm" />
      ) : principal ? (
        <ul className="max-w-sm space-y-2">
          <li className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4">
            <PrincipalBadge subjectType={principal.subjectType} name="Você" />
            <span className="font-mono text-xs font-bold text-muted capitalize">
              {principal.role}
            </span>
          </li>
        </ul>
      ) : null}

      <p className="max-w-sm rounded-2xl border border-status-blocked bg-surface p-4 text-sm leading-6">
        A API ainda não expõe a lista completa de membros nem convite por e-mail
        (`/v1/workspaces/:workspaceId/context` só retorna seu próprio papel). Esta tela mostra o que
        já está disponível e será ampliada quando o endpoint existir.
      </p>
    </section>
  );
}
