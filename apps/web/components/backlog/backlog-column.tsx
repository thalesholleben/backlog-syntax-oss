"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import type { ColumnSpec } from "@/lib/backlog/view-model";

const dotClass: Record<string, string> = {
  open: "bg-status-open",
  in_progress: "bg-status-progress",
  blocked: "bg-status-blocked",
  done: "bg-[rgba(18,18,18,.72)]",
};

/**
 * Coluna do quadro. A de concluído inverte: cabeçalho no acento, para a pilha
 * do que já saiu da frente não competir visualmente com o que ainda está aberto.
 */
export function BacklogColumn({
  column,
  count,
  children,
  empty,
}: {
  column: ColumnSpec;
  count: number;
  children: ReactNode;
  empty: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${column.key}`,
    data: { status: column.key },
  });
  const isDone = column.key === "done";

  return (
    <section
      ref={setNodeRef}
      aria-label={`Coluna ${column.label}`}
      data-alvo={isOver || undefined}
      className="flex min-w-0 flex-col rounded-panel p-1 transition-colors data-[alvo]:bg-[var(--ink-drop)] data-[alvo]:shadow-[inset_0_0_0_1.5px_var(--accent)]"
    >
      <div
        className={`mb-[9px] flex items-center gap-2 rounded-full py-[7px] pl-3 pr-[9px] ${
          isDone ? "bg-accent" : "bg-ink-3"
        }`}
      >
        <span
          aria-hidden="true"
          className={`size-[7px] shrink-0 rounded-full ${dotClass[column.key]}`}
        />
        <h2
          className={`truncate font-mono text-[9.5px] font-bold uppercase leading-none tracking-[0.14em] ${
            isDone ? "text-[rgba(18,18,18,.62)]" : "text-ink-muted"
          }`}
        >
          {column.label}
        </h2>
        <span
          className={`ml-auto shrink-0 rounded-full px-2 py-1 font-mono text-[10px] font-extrabold leading-none ${
            isDone
              ? "bg-[rgba(18,18,18,.13)] text-accent-foreground"
              : "bg-ink-chip text-ink-foreground"
          }`}
        >
          {count}
        </span>
      </div>

      <div className="bl-scroll flex min-w-0 flex-col gap-1.5 xl:-mr-1 xl:max-h-[calc(100vh-16rem)] xl:min-h-[190px] xl:overflow-y-auto xl:overflow-x-hidden xl:pr-1">
        {children}
        {empty ? (
          <p className="grid min-h-16 place-items-center rounded-control border-[1.5px] border-dashed border-ink-line px-2.5 py-4 text-center font-mono text-[10px] font-semibold leading-[1.6] text-ink-faint">
            {column.empty}
          </p>
        ) : null}
      </div>
    </section>
  );
}
