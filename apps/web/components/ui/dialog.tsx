"use client";

import { useI18n } from "@/lib/i18n/provider";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** "drawer" anchors to the right edge (task detail); "modal" centers (confirmations, forms). */
  variant?: "drawer" | "modal";
  className?: string;
}

/**
 * Wraps the native <dialog> element: free focus trap, Escape-to-close, and ::backdrop.
 * Avoids pulling in a floating-UI/Radix dependency for a feature the platform already provides.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  variant = "modal",
  className,
}: DialogProps) {
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
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target === node) onClose();
    };
    node.addEventListener("cancel", handleCancel);
    node.addEventListener("click", handleBackdropClick);
    return () => {
      node.removeEventListener("cancel", handleCancel);
      node.removeEventListener("click", handleBackdropClick);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={ref}
      className="bl-dialog fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none bg-transparent"
      aria-label={title}
      onClose={onClose}
    >
      <div
        className={cn(
          "flex h-full flex-col overflow-y-auto bg-surface shadow-pop",
          variant === "drawer"
            ? "ml-auto w-full max-w-xl [animation:bl-slide-in-right_220ms_cubic-bezier(0.2,0,0,1)]"
            : "mx-auto my-auto max-h-[85vh] w-full max-w-lg rounded-card [animation:bl-rise-in_180ms_cubic-bezier(0.2,0,0,1)]",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-5">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Fechar")}
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-panel hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="flex-1 px-6 py-6">{children}</div>
      </div>
    </dialog>,
    document.body,
  );
}
