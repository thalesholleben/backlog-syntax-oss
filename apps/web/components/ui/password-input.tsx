"use client";

import { useI18n } from "@/lib/i18n/provider";
import { Eye, EyeOff } from "lucide-react";
import { type InputHTMLAttributes, useId, useState } from "react";
import { cn } from "@/lib/cn";

export function PasswordInput({
  className,
  autoComplete = "current-password",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const { t } = useI18n();

  const [visible, setVisible] = useState(false);
  const toggleId = useId();

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        className={cn(
          "min-h-12 w-full rounded-control border border-line bg-surface px-4 pr-12 text-base text-foreground",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent",
          "aria-invalid:border-danger",
          className,
        )}
        {...props}
      />
      <button
        id={toggleId}
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? t("Ocultar senha") : t("Mostrar senha")}
        aria-pressed={visible}
        className="absolute inset-y-0 right-1 my-1 flex w-10 items-center justify-center rounded-control text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent"
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-5" />
        ) : (
          <Eye aria-hidden="true" className="size-5" />
        )}
      </button>
    </div>
  );
}
