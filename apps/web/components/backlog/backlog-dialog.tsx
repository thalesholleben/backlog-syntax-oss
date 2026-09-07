"use client";

import { useI18n } from "@/lib/i18n/provider";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Casca de diálogo do quadro. Usa o <dialog> nativo, que já traz o foco preso,
 * o Escape e o ::backdrop sem nenhuma dependência a mais.
 */
export function BacklogDialog({
  open,
  onClose,
  eyebrow,
  title,
  intro,
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();

  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const cancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    const backdrop = (event: MouseEvent) => {
      if (event.target === node) onClose();
    };
    node.addEventListener("cancel", cancel);
    node.addEventListener("click", backdrop);
    return () => {
      node.removeEventListener("cancel", cancel);
      node.removeEventListener("click", backdrop);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={title}
      className="bl-dialog fixed inset-0 m-auto max-h-[calc(100vh-2rem)] w-[min(660px,calc(100vw-1.5rem))] overflow-auto rounded-card bg-surface text-foreground shadow-pop"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line-soft px-6 pb-[17px] pt-[22px]">
        <div>
          <p className="mb-2 font-mono text-[9px] font-bold uppercase leading-none tracking-[0.16em] text-faint">
            {eyebrow}
          </p>
          <h2 className="text-xl font-extrabold leading-[1.15] tracking-[-0.03em]">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("Fechar")}
          className="grid size-[34px] shrink-0 place-items-center rounded-full border border-line bg-surface text-lg leading-none text-muted hover:border-line-strong hover:bg-panel hover:text-foreground"
        >
          ×
        </button>
      </div>
      <div className="px-6 pb-7 pt-6">
        {intro ? <p className="mb-5 text-xs leading-[1.55] text-muted">{intro}</p> : null}
        {children}
      </div>
    </dialog>,
    document.body,
  );
}

export const fieldLabel =
  "font-mono text-[9.5px] font-bold uppercase leading-none tracking-[0.1em] text-muted";

export const fieldControl =
  "w-full rounded-control border border-line bg-panel px-3.5 py-3 text-[12.5px] font-medium leading-[1.45] text-foreground placeholder:text-faint";

export const dialogActions =
  "mt-5 flex items-center justify-end gap-2.5 border-t border-line-soft pt-4 max-sm:flex-col-reverse max-sm:items-stretch";

export const cancelButton =
  "min-h-10 rounded-full border border-line bg-surface px-[18px] text-[12.5px] font-bold text-muted hover:bg-panel hover:text-foreground";

export const submitButton =
  "min-h-10 rounded-full border border-contrast bg-contrast px-[18px] text-[12.5px] font-bold text-contrast-foreground hover:bg-contrast-hover disabled:opacity-50";
