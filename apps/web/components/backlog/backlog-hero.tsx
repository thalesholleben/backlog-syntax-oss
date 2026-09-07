"use client";

import type { Translator } from "@/lib/i18n/translate";

import { useI18n } from "@/lib/i18n/provider";
import { Moon, Plus, Search, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import type { Owner } from "@/lib/backlog/view-model";

type OwnerFilter = Owner | "todos";

const FILTERS = (t: Translator): { key: OwnerFilter; label: string; dot: string }[] => [
  { key: "todos", label: t("Todos"), dot: "bg-faint" },
  { key: "human", label: t("Pessoas"), dot: "bg-owner-human" },
  { key: "agent", label: t("Agentes"), dot: "bg-owner-agent" },
  { key: "free", label: t("Livres"), dot: "bg-owner-free" },
];

export function BacklogHero({
  workspaceName,
  kpis,
  counts,
  ownerFilter,
  onOwnerFilter,
  search,
  onSearch,
  onNewTask,
}: {
  workspaceName: string;
  kpis: { open: number; human: number; agent: number; done: number };
  counts: Record<OwnerFilter, number>;
  ownerFilter: OwnerFilter;
  onOwnerFilter: (value: OwnerFilter) => void;
  search: string;
  onSearch: (value: string) => void;
  onNewTask: () => void;
}) {
  const { t } = useI18n();

  return (
    <header className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-3.5 rounded-card bg-surface px-[18px] py-3.5 shadow-card">
      <div className="flex shrink-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-[38px] shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[17px] fill-current">
            <path d="M4 5h9v2.4H4zM4 10.8h16v2.4H4zM4 16.6h12V19H4z" />
          </svg>
        </span>
        <div>
          <h1 className="text-[26px] font-extrabold leading-none tracking-[-0.04em]">
            Backlog<span className="text-accent">.</span>
          </h1>
          <p className="mt-[7px] font-mono text-[8.5px] font-bold uppercase leading-none tracking-[0.18em] text-faint">
            {workspaceName}
          </p>
        </div>
      </div>

      <dl className="flex shrink-0 items-center max-lg:order-3 max-lg:w-full max-lg:justify-between max-sm:grid max-sm:grid-cols-2 max-sm:gap-y-2">
        <Kpi label={t("em aberto")} value={kpis.open} />
        <Kpi label={t("Pessoas")} value={kpis.human} tone="text-owner-human" />
        <Kpi label={t("Agentes")} value={kpis.agent} tone="text-owner-agent" />
        <Kpi label={t("concluídas")} value={kpis.done} tone="text-status-done-ink" />
      </dl>

      <div className="flex flex-wrap items-center justify-end gap-2 lg:ml-auto max-lg:w-full">
        <fieldset
          aria-label={t("Filtrar o quadro por responsável")}
          className="inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-[3px] max-sm:w-full"
        >
          {FILTERS(t).map((filter) => {
            const active = ownerFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => onOwnerFilter(filter.key)}
                aria-pressed={active}
                className={`inline-flex cursor-pointer items-center gap-[7px] rounded-full px-3 py-2 text-xs font-semibold tracking-[-0.01em] transition-colors max-sm:flex-1 max-sm:justify-center max-sm:px-1.5 ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted hover:bg-panel hover:text-foreground"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`size-[7px] shrink-0 rounded-full ${active ? "bg-accent-foreground" : filter.dot}`}
                />
                {filter.label}
                <span
                  className={`font-mono text-[10.5px] font-bold ${active ? "opacity-65" : "text-faint"}`}
                >
                  {counts[filter.key]}
                </span>
              </button>
            );
          })}
        </fieldset>

        <ThemeToggle />

        <div className="inline-flex h-[38px] items-center gap-[7px] rounded-full border border-line bg-surface px-3">
          <Search aria-hidden="true" className="size-3.5 shrink-0 text-faint" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={t("buscar no backlog")}
            aria-label={t("Buscar por título, descrição ou motivo do bloqueio")}
            className="w-[150px] border-0 bg-transparent text-xs text-foreground outline-none placeholder:text-faint max-sm:w-full max-md:w-[110px]"
          />
        </div>

        <button
          type="button"
          onClick={onNewTask}
          className="inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full bg-contrast px-4 text-[12.5px] font-bold tracking-[-0.012em] text-contrast-foreground shadow-[0_6px_16px_-10px_rgba(18,18,18,.55)] transition-transform hover:bg-contrast-hover hover:-translate-y-px active:translate-y-0"
        >
          <Plus aria-hidden="true" className="size-[15px] opacity-60" />
          {t("Nova tarefa")}
        </button>
      </div>
    </header>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="relative px-4 py-0.5 first:pl-0 max-sm:px-3 [&+&]:before:absolute [&+&]:before:bottom-[14%] [&+&]:before:left-0 [&+&]:before:top-[14%] [&+&]:before:w-px [&+&]:before:bg-line max-lg:[&+&]:before:hidden">
      <dt className="mb-[7px] whitespace-nowrap font-mono text-[9px] font-semibold uppercase leading-none tracking-[0.12em] text-faint">
        {label}
      </dt>
      <dd
        className={`text-[21px] font-extrabold leading-none tracking-[-0.04em] ${tone ?? "text-foreground"}`}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * O tema vive em `data-tema` no <html> e é escrito antes da primeira pintura por
 * um script no layout. Aqui só lemos o que já está lá para desenhar o ícone
 * certo, sem um segundo estado que possa discordar do DOM.
 */
export function ThemeToggle() {
  const { t } = useI18n();

  const [dark, setDark] = useState(false);

  useEffect(() => {
    const chosen = document.documentElement.dataset.tema;
    setDark(
      chosen === "escuro" || (!chosen && window.matchMedia("(prefers-color-scheme: dark)").matches),
    );
  }, []);

  function toggle() {
    const next = dark ? "claro" : "escuro";
    document.documentElement.dataset.tema = next;
    try {
      localStorage.setItem("bl-tema", next);
    } catch {
      /* navegador sem storage: o tema vale só nesta aba, e isso basta */
    }
    setDark(!dark);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={t("Alternar tema claro e escuro")}
      title={t("Alternar tema claro e escuro")}
      className="grid size-[38px] shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-surface text-muted transition-[color,border-color,background-color,transform] hover:-translate-y-px hover:border-line-strong hover:bg-panel hover:text-foreground active:translate-y-0"
    >
      {dark ? (
        <Sun aria-hidden="true" className="size-[17px]" />
      ) : (
        <Moon aria-hidden="true" className="size-[17px]" />
      )}
    </button>
  );
}
