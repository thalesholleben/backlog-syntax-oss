import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

export function Checkbox({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn("flex cursor-pointer items-start gap-3 text-sm leading-6", className)}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 rounded-[0.35rem] border-2 border-line accent-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}
