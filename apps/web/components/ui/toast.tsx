"use client";

import { useI18n } from "@/lib/i18n/provider";
import { CheckCircle2, TriangleAlert, X } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  tone: "success" | "error";
  message: string;
  action?: ToastAction;
}

interface NotifyOptions {
  action?: ToastAction;
  durationMs?: number;
}

interface ToastContextValue {
  notify: (tone: Toast["tone"], message: string, options?: NotifyOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within <ToastProvider>");
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const notify = useCallback(
    (tone: Toast["tone"], message: string, options: NotifyOptions = {}) => {
      counter.current += 1;
      const id = `toast-${counter.current}`;
      setToasts((current) => [
        ...current,
        { id, tone, message, ...(options.action ? { action: options.action } : {}) },
      ]);
      setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, options.durationMs ?? 5_000);
    },
    [],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
      >
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onDismiss={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { t } = useI18n();

  const id = useId();
  const Icon = toast.tone === "success" ? CheckCircle2 : TriangleAlert;
  return (
    <div
      id={id}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-pop [animation:bl-rise-in_180ms_cubic-bezier(0.2,0,0,1)]",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-5 shrink-0",
          toast.tone === "success" ? "text-status-done" : "text-danger",
        )}
      />
      <p className="flex-1 text-sm leading-6">{toast.message}</p>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
          className="shrink-0 text-sm font-bold text-foreground underline decoration-line underline-offset-4"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("Fechar aviso")}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-panel hover:text-foreground"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
