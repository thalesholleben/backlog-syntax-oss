"use client";

import { useI18n } from "@/lib/i18n/provider";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  value: string;
  label: string;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: readonly TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const { t } = useI18n();

  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    refs.current[value]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [value]);

  function focusIndex(index: number) {
    const clamped = (index + items.length) % items.length;
    const item = items[clamped];
    if (!item) return;
    refs.current[item.value]?.focus();
    onChange(item.value);
  }

  return (
    <div
      role="tablist"
      aria-label={t("Estados do quadro")}
      className={cn(
        "bl-scroll flex snap-x gap-1 overflow-x-auto scroll-smooth rounded-full border border-line bg-surface p-1",
        className,
      )}
      onKeyDown={(event) => {
        const index = items.findIndex((item) => item.value === value);
        if (event.key === "ArrowRight") {
          event.preventDefault();
          focusIndex(index + 1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          focusIndex(index - 1);
        }
      }}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(node) => {
              refs.current[item.value] = node;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              "min-h-10 shrink-0 snap-start whitespace-nowrap rounded-full px-4 text-sm font-bold transition-colors",
              selected ? "bg-foreground text-background" : "text-muted hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
