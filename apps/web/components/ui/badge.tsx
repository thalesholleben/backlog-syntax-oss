import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Badge({
  children,
  className,
  dotClassName,
}: {
  children: ReactNode;
  className?: string;
  dotClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-bold text-muted",
        className,
      )}
    >
      {dotClassName ? (
        <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", dotClassName)} />
      ) : null}
      {children}
    </span>
  );
}
