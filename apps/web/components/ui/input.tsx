import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-12 w-full rounded-control border border-line bg-surface px-4 text-base text-foreground placeholder:text-muted",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent",
        "aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}
