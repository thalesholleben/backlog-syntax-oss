"use client";

import { useI18n } from "@/lib/i18n/provider";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveWorkspace } from "@/lib/use-active-workspace";

export default function WorkspaceSettingsPage() {
  const { t } = useI18n();

  const params = useParams<{ workspaceSlug: string }>();
  const { summary, contextQuery } = useActiveWorkspace(params.workspaceSlug);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">Workspace</h1>
        <p className="mt-1 text-sm text-muted">
          {t("Isolado por RLS: nenhum outro workspace vê estes dados.")}
        </p>
      </div>

      {contextQuery.isLoading || !summary ? (
        <Skeleton className="h-24 w-full max-w-sm" />
      ) : (
        <div className="max-w-sm space-y-4 rounded-card border border-line bg-surface p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">{t("Nome")}</p>
            <p className="mt-1 font-semibold">{summary.name}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Slug</p>
            <p className="mt-1 font-mono text-sm">{summary.slug}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">
              {t("Seu papel")}
            </p>
            <p className="mt-1 font-semibold capitalize">{summary.role}</p>
          </div>
        </div>
      )}

      <p className="max-w-sm text-sm text-muted">
        {t(
          "Renomear workspace e transferir titularidade ainda não têm endpoint definido; esta seção só exibe os dados atuais.",
        )}
      </p>
    </section>
  );
}
