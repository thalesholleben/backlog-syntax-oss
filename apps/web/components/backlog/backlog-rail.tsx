"use client";

import { useI18n } from "@/lib/i18n/provider";
import { Check, Pin, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { BoardTask } from "@/lib/backlog/board-task";
import { COLUMNS, type Owner, shortDate } from "@/lib/backlog/view-model";

export const ALL_PROJECTS = "todos";

/** O que o quadro precisa de um projeto. O contexto do workspace devolve só isto. */
export interface ProjectRef {
  id: string;
  name: string;
  slug: string;
}

const statusBarClass: Record<string, string> = {
  open: "bg-[linear-gradient(180deg,#7daafb,#3b82f6)]",
  in_progress: "bg-[linear-gradient(180deg,#b79dfa,#8b5cf6)]",
  blocked: "bg-[linear-gradient(180deg,#f79bc7,#ec4899)]",
  done: "bg-[linear-gradient(180deg,#5ddcaf,#10b981)]",
};

const statusDotVar: Record<string, string> = {
  open: "var(--status-open)",
  in_progress: "var(--status-progress)",
  blocked: "var(--status-blocked)",
  done: "var(--status-done)",
};

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-[262px] flex-1 rounded-card bg-surface px-[17px] py-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-[13px] font-bold tracking-[-0.022em]">{title}</h2>
        {action}
      </div>
      <p className="mb-3 mt-[3px] text-[10.5px] leading-[1.5] text-faint">{subtitle}</p>
      {children}
    </div>
  );
}

export function BacklogRail({
  openByOwner,
  countsByStatus,
  projects,
  countByProject,
  activeProject,
  pinnedProject,
  onFilterProject,
  onPinProject,
  onNewProject,
  onDeleteProject,
}: {
  openByOwner: Record<Owner, number>;
  countsByStatus: Record<string, number>;
  projects: ProjectRef[];
  countByProject: Map<string, number>;
  activeProject: string;
  pinnedProject: string | null;
  onFilterProject: (slug: string) => void;
  onPinProject: (slug: string) => void;
  onNewProject: () => void;
  onDeleteProject: (projectId: string) => void;
}) {
  const { t } = useI18n();

  const peak = Math.max(1, ...COLUMNS.map((column) => countsByStatus[column.key] ?? 0));
  /* Todo projeto vivo aparece, inclusive o de contagem zero. Filtrar por contagem
     escondia o projeto no instante em que ele nascia e deixava o projeto vazio
     inalcancavel como filtro, que e justamente quando se quer alcanca-lo. */
  const visibleProjects = projects
    .map((project) => ({ project, count: countByProject.get(project.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.project.name.localeCompare(b.project.name));

  return (
    <>
      <Panel
        title={t("Onde está travado")}
        subtitle={t("Tarefas não concluídas, por responsável.")}
      >
        <div className="flex gap-2">
          {(
            [
              ["human", t("Pessoas"), "text-owner-human"],
              ["agent", t("Agentes"), "text-owner-agent"],
              ["free", t("Livres"), "text-foreground"],
            ] as const
          ).map(([owner, label, tone]) => (
            <div key={owner} className="flex-1 rounded-panel bg-panel px-3 py-3">
              <b
                className={`block text-2xl font-extrabold leading-none tracking-[-0.04em] ${tone}`}
              >
                {openByOwner[owner]}
              </b>
              <span className="mt-1.5 block font-mono text-[9px] font-semibold uppercase leading-[1.4] tracking-[0.12em] text-faint">
                {label}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title={t("Projetos")}
        subtitle={t("Tarefas não concluídas por projeto. Clique para filtrar o quadro.")}
        action={
          <button
            type="button"
            onClick={onNewProject}
            className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-panel hover:text-foreground"
            aria-label={t("Criar projeto")}
            title={t("Criar projeto")}
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>
        }
      >
        <div className="bl-scroll flex max-h-[270px] flex-col gap-px overflow-auto">
          <ProjectRow
            slug={ALL_PROJECTS}
            name={t("Todos os projetos")}
            count={[...countByProject.values()].reduce((sum, n) => sum + n, 0)}
            active={activeProject === ALL_PROJECTS}
            pinned={false}
            pinnable={false}
            onFilter={onFilterProject}
            onPin={onPinProject}
          />
          {visibleProjects.map(({ project, count }) => (
            <ProjectRow
              key={project.id}
              slug={project.slug}
              name={project.name}
              count={count}
              active={activeProject === project.slug}
              pinned={pinnedProject === project.slug}
              pinnable
              onFilter={onFilterProject}
              onPin={onPinProject}
              onDelete={() => onDeleteProject(project.id)}
            />
          ))}
        </div>
      </Panel>

      <Panel
        title={t("Distribuição por status")}
        subtitle={t("Contagem real, incluindo as concluídas.")}
      >
        <div className="mb-3.5 grid grid-cols-1 gap-x-3.5 gap-y-0.5 sm:grid-cols-2">
          {COLUMNS.map((column) => (
            <div key={column.key} className="flex items-center gap-2 py-1 text-[11.5px] text-muted">
              <i
                aria-hidden="true"
                style={{ background: statusDotVar[column.key] }}
                className="block size-[7px] shrink-0 rounded-full"
              />
              {t(column.label)}
              <b className="ml-auto font-mono text-[10.5px] font-bold text-faint">
                {countsByStatus[column.key] ?? 0}
              </b>
            </div>
          ))}
        </div>

        <div className="mb-[9px] flex h-[76px] items-end gap-2">
          {COLUMNS.map((column, index) => {
            const value = countsByStatus[column.key] ?? 0;
            return (
              <div key={column.key} className="flex h-full flex-1 flex-col items-center gap-[7px]">
                <span className="font-mono text-[11px] font-extrabold text-muted">{value}</span>
                {/* A barra mora num trilho próprio: dividir a altura com o número
                    comprimia as maiores e fazia contagens diferentes empatarem. */}
                <div className="flex w-full flex-1 items-end">
                  <span
                    aria-hidden="true"
                    style={{
                      height: `${Math.max(6, (value / peak) * 100)}%`,
                      animationDelay: `${index * 70}ms`,
                    }}
                    className={`bl-bar w-full rounded-b rounded-t-lg ${statusBarClass[column.key]}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          {[t("Aberto"), "Andam.", "Bloq.", "Concl."].map((label) => (
            <span
              key={label}
              className="flex-1 text-center font-mono text-[8.5px] font-semibold uppercase leading-[1.3] tracking-[0.08em] text-faint"
            >
              {label}
            </span>
          ))}
        </div>
      </Panel>
    </>
  );
}

export function RecentlyClosedPanel({ recentlyClosed }: { recentlyClosed: BoardTask[] }) {
  const { t, locale } = useI18n();

  return (
    <Panel title={t("Fechadas recentemente")} subtitle={t("As últimas que saíram da frente.")}>
      {recentlyClosed.length === 0 ? (
        <p className="grid min-h-16 place-items-center rounded-control border-[1.5px] border-dashed border-line px-2.5 py-4 text-center font-mono text-[10px] font-semibold text-faint">
          {t("nada fechado ainda")}
        </p>
      ) : (
        recentlyClosed.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-2.5 border-t border-line-soft py-2 text-[11.8px] leading-[1.45] first:border-t-0"
          >
            <span className="mt-px grid size-[18px] shrink-0 place-items-center rounded-full bg-status-done-soft">
              <Check aria-hidden="true" className="size-2.5 text-status-done-ink" />
            </span>
            <span className="flex-1 text-muted">{task.title}</span>
            <span className="mt-[3px] shrink-0 font-mono text-[9.5px] font-bold text-faint">
              {shortDate(task.updatedAt, locale)}
            </span>
          </div>
        ))
      )}
    </Panel>
  );
}

function ProjectRow({
  slug,
  name,
  count,
  active,
  pinned,
  pinnable,
  onFilter,
  onPin,
  onDelete,
}: {
  slug: string;
  name: string;
  count: number;
  active: boolean;
  pinned: boolean;
  pinnable: boolean;
  onFilter: (slug: string) => void;
  onPin: (slug: string) => void;
  onDelete?: (() => void) | undefined;
}) {
  const { t } = useI18n();

  return (
    <div className="flex items-center">
      <button
        type="button"
        disabled={!pinnable}
        onClick={() => onPin(slug)}
        aria-pressed={pinned}
        title={pinned ? t("Remover projeto padrão") : t("Abrir este projeto por padrão")}
        aria-label={
          pinned
            ? t("Remover {0} como projeto padrão", { "0": name })
            : t("Abrir {0} por padrão", { "0": name })
        }
        className="grid h-7 w-[18px] shrink-0 place-items-center text-faint disabled:opacity-0"
      >
        {pinned ? (
          <Pin aria-hidden="true" className="size-3 fill-current text-accent-foreground" />
        ) : (
          <i aria-hidden="true" className="block size-[7px] rounded-full bg-current" />
        )}
      </button>
      <button
        type="button"
        onClick={() => onFilter(slug)}
        aria-pressed={active}
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg py-[5px] pl-[3px] pr-[7px] text-left text-[11.5px] ${
          active
            ? "bg-contrast text-contrast-foreground"
            : "text-muted hover:bg-panel hover:text-foreground"
        }`}
      >
        <span className="truncate">{name}</span>
        <b
          className={`ml-auto font-mono text-[10.5px] font-bold ${count === 0 ? "opacity-40" : "opacity-80"}`}
        >
          {count}
        </b>
      </button>
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          title={t("Apagar projeto")}
          aria-label={t("Apagar {0}", { "0": name })}
          className="grid h-7 w-[22px] shrink-0 place-items-center rounded text-faint hover:text-danger"
        >
          <Trash2 aria-hidden="true" className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
