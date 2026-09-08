"use client";

import type { Translator } from "@/lib/i18n/translate";

import { useI18n } from "@/lib/i18n/provider";
import { site } from "@/lib/site";
import { Bot, Braces, ExternalLink, Globe2, Puzzle, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

const surfaces = (t: Translator) =>
  [
    {
      id: "api",
      eyebrow: t("HTTP · contrato estável"),
      title: t("API REST"),
      icon: Braces,
      copy: t(
        "Integrações de servidor, automações e agentes que precisam de um contrato HTTP explícito.",
      ),
    },
    {
      id: "mcp",
      eyebrow: t("Remoto · OAuth"),
      title: "MCP",
      icon: Bot,
      copy: t(
        "Clientes de IA acessam tools tipadas, claims com lease e eventos auditáveis no workspace.",
      ),
    },
    {
      id: "webmcp",
      eyebrow: t("Navegador · progressivo"),
      title: "WebMCP",
      icon: Globe2,
      copy: t(
        "O agente presente no navegador recebe ferramentas contextuais da página aberta, quando houver suporte.",
      ),
    },
  ] as const;

interface DocumentationContentProps {
  apiUrl: string;
  workspaceId: string;
  workspaceName: string;
  boxed?: boolean;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bl-scroll overflow-x-auto rounded-panel bg-contrast p-4 text-[11px] leading-6 text-contrast-foreground">
      <code>{children}</code>
    </pre>
  );
}

export function DocumentationContent({
  apiUrl,
  workspaceId,
  workspaceName,
  boxed = false,
}: DocumentationContentProps) {
  const { t } = useI18n();

  return (
    <div
      data-documentation-layout={boxed ? "boxed" : "fluid"}
      className={`bl-glow pb-12 pt-5 ${
        boxed ? "mx-auto w-full max-w-6xl px-4 sm:px-6" : "px-3 sm:px-6"
      }`}
    >
      <header className="rounded-card bg-surface px-5 py-6 shadow-card sm:px-7">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-faint">
          {t("Integrações ·")} {workspaceName}
        </p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
              {t("Documentação")}
              <span className="text-faint">.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              {t(
                "Três superfícies, uma regra de negócio. API, MCP e WebMCP chamam os mesmos casos de uso; autorização, tenant e concorrência continuam no servidor.",
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-panel bg-panel px-4 py-3 text-xs text-muted">
            <ShieldCheck aria-hidden="true" className="size-5 text-status-done-ink" />
            <span>
              <b className="text-foreground">{t("Tenant fixado no token.")}</b>
              <br />
              {t("O agente nunca escolhe outro workspace.")}
            </span>
          </div>
        </div>
      </header>

      {/* Placed before the three surfaces on purpose: connecting MCP only hands the agent
          the tools, and without the skill it usually ignores the service or invents a
          workspace id. Someone who reads only the first block still learns that. */}
      <section className="mt-3 rounded-card border border-accent bg-surface p-5 shadow-card sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
            <Puzzle aria-hidden="true" className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.13em] text-faint">
              {t("Comece por aqui · Claude Code e Codex")}
            </p>
            <h2 className="mt-1 text-xl font-extrabold tracking-[-0.03em]">
              {t("Instale a skill antes de conectar")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {t(
                "Conectar o MCP entrega as ferramentas ao agente, mas é a skill que diz a ele quando usá-las, em qual workspace escrever, como evitar tarefa duplicada e que registrar uma pendência não autoriza executá-la. Sem ela, o agente conectado costuma ignorar o serviço.",
              )}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.9fr)]">
          <div>
            <h3 className="text-sm font-extrabold">{t("No Claude Code, sem clonar nada")}</h3>
            <p className="mt-2 text-xs leading-5 text-muted">
              {t(
                "No Codex, ou para instalar a partir de um clone do repositório, use o script de instalação descrito no README das skills.",
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`${site.github}/tree/main/skills`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-contrast px-4 text-xs font-bold text-contrast-foreground"
              >
                {t("Skills e instalação")} <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            </div>
          </div>
          <CodeBlock>{`/plugin marketplace add thalesholleben/backlog-syntax-oss
/plugin install backlog-cloud@backlog-syntax`}</CodeBlock>
        </div>
      </section>

      <nav
        aria-label={t("Nesta documentação")}
        className="bl-scroll mt-3 flex gap-2 overflow-x-auto pb-1"
      >
        {surfaces(t).map((surface) => (
          <a
            key={surface.id}
            href={`#${surface.id}`}
            className="shrink-0 rounded-full border border-line bg-surface px-4 py-2.5 text-xs font-bold text-muted hover:border-line-strong hover:text-foreground"
          >
            {surface.title}
          </a>
        ))}
      </nav>

      <div className="mt-3 space-y-3">
        <DocSection surface={surfaces(t)[0]}>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.9fr)]">
            <div>
              <h3 className="text-sm font-extrabold">{t("Começo rápido")}</h3>
              <ol className="mt-3 space-y-3 text-sm leading-6 text-muted">
                <li>
                  <b className="text-foreground">1.</b>{" "}
                  {t("Crie uma conta de serviço em Configurações → Agentes e tokens.")}
                </li>
                <li>
                  <b className="text-foreground">2.</b>{" "}
                  {t("Guarde o token exibido uma única vez e envie-o como Bearer.")}
                </li>
                <li>
                  <b className="text-foreground">3.</b> {t("Use")}{" "}
                  <code className="font-mono text-xs text-foreground">If-Match</code> {t("e")}{" "}
                  <code className="font-mono text-xs text-foreground">Idempotency-Key</code>{" "}
                  {t("nas mutações.")}
                </li>
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`${apiUrl}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-contrast px-4 text-xs font-bold text-contrast-foreground"
                >
                  {t("Referência interativa")}{" "}
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
                <a
                  href={`${apiUrl}/openapi.json`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-xs font-bold text-muted hover:text-foreground"
                >
                  OpenAPI JSON <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              </div>
            </div>
            <CodeBlock>{`curl "${apiUrl}/v1/workspaces/${workspaceId}/tasks?limit=20" \\
  -H "Authorization: Bearer $BACKLOG_TOKEN"`}</CodeBlock>
          </div>
        </DocSection>

        <DocSection surface={surfaces(t)[1]}>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.9fr)]">
            <div>
              <h3 className="text-sm font-extrabold">{t("Conectar um cliente")}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                {t(
                  "Adicione o endpoint remoto abaixo em um cliente MCP compatível com OAuth. O fluxo usa PKCE, mostra os escopos antes do consentimento e não reaproveita a sessão do navegador.",
                )}
              </p>
              <ul className="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-2">
                {[
                  t("contexto e listagem"),
                  t("criar e atualizar"),
                  t("claim, extensão e release"),
                  t("handoff e eventos"),
                ].map((item) => (
                  <li key={item} className="rounded-control bg-panel px-3 py-2.5">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-faint">
                {t("Endpoint remoto")}
              </p>
              <CodeBlock>{`${apiUrl}/mcp`}</CodeBlock>
              <p className="mt-3 text-xs leading-5 text-muted">
                {t(
                  "Para scripts sem cliente MCP, prefira a API REST com token de conta de serviço.",
                )}
              </p>
            </div>
          </div>
        </DocSection>

        <DocSection surface={surfaces(t)[2]}>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.9fr)]">
            <div>
              <h3 className="text-sm font-extrabold">{t("Como funciona")}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                {t("O app detecta")}{" "}
                <code className="font-mono text-xs text-foreground">document.modelContext</code>
                {t(
                  ". Se a API experimental existir, registra ferramentas limitadas ao projeto aberto; caso contrário, a interface humana segue normal.",
                )}
              </p>
              <p className="mt-3 text-xs leading-5 text-muted">
                {t(
                  "WebMCP é conveniência contextual. O MCP remoto continua sendo a integração principal para agentes.",
                )}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {["list_tasks", "create_task", "update_task_status", "schedule_task"].map((tool) => (
                <code
                  key={tool}
                  className="rounded-control bg-panel px-3 py-3 text-xs font-bold text-foreground"
                >
                  {tool}
                </code>
              ))}
            </div>
          </div>
        </DocSection>
      </div>
    </div>
  );
}

function DocSection({
  surface,
  children,
}: {
  surface: ReturnType<typeof surfaces>[number];
  children: ReactNode;
}) {
  const Icon = surface.icon;
  return (
    <section
      id={surface.id}
      className="scroll-mt-20 rounded-card bg-surface p-5 shadow-card sm:p-7"
    >
      <div className="mb-6 flex items-start gap-3 border-b border-line-soft pb-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
          <Icon aria-hidden="true" className="size-[18px]" />
        </span>
        <div>
          <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.13em] text-faint">
            {surface.eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-extrabold tracking-[-0.03em]">{surface.title}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">{surface.copy}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
