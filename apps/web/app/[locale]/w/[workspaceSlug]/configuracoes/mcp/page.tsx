"use client";

import { useI18n } from "@/lib/i18n/provider";
import { useParams } from "next/navigation";
import { env } from "@/lib/env";
import { useActiveWorkspace } from "@/lib/use-active-workspace";

export default function McpSettingsPage() {
  const { t } = useI18n();

  const params = useParams<{ workspaceSlug: string }>();
  const { summary } = useActiveWorkspace(params.workspaceSlug);
  const mcpUrl = new URL("/mcp", env.NEXT_PUBLIC_API_URL).toString();

  return (
    <section className="max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">{t("Conexão MCP")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(
            "Conecte um agente a este workspace pelo protocolo MCP, sem reaproveitar sua sessão de navegador.",
          )}
        </p>
      </div>

      <ol className="space-y-4">
        <li className="rounded-2xl border border-line bg-surface p-4">
          <p className="font-mono text-xs font-bold text-muted">01</p>
          <p className="mt-1 font-semibold">
            {t(
              "No cliente MCP compatível com OAuth, adicione o endpoint abaixo como servidor remoto.",
            )}
          </p>
        </li>
        <li className="rounded-2xl border border-line bg-surface p-4">
          <p className="font-mono text-xs font-bold text-muted">02</p>
          <p className="mt-1 font-semibold">{t("Aponte o cliente MCP para este endpoint:")}</p>
          <code className="mt-2 block overflow-x-auto rounded-control bg-panel p-3 text-xs">
            {mcpUrl}
          </code>
        </li>
        <li className="rounded-2xl border border-line bg-surface p-4">
          <p className="font-mono text-xs font-bold text-muted">03</p>
          <p className="mt-1 font-semibold">
            {t(
              "Conclua o login e revise os escopos na tela de consentimento. O cliente usa OAuth com PKCE e token restrito ao recurso MCP.",
            )}
          </p>
        </li>
      </ol>

      <p className="rounded-2xl border border-status-blocked bg-surface p-4 text-sm leading-6">
        {t(
          "Tokens de service account são destinados à API REST e não substituem o OAuth do endpoint MCP. Revogue uma autorização no cliente e encerre sessões se suspeitar de vazamento.",
        )}
      </p>

      {summary ? <p className="font-mono text-xs text-muted">workspace: {summary.id}</p> : null}
    </section>
  );
}
