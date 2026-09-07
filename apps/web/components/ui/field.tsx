import type { ReactNode } from "react";
import { useId } from "react";

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string | undefined;
  children: (ids: { inputId: string; describedBy: string | undefined }) => ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  const inputId = useId();
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-bold">
        {label}
      </label>
      {children({ inputId, describedBy })}
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
