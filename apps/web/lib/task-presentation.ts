import type { Locale } from "@/lib/i18n/routing";
import type { TaskPriority, TaskStatus } from "./domain-types";

export const TASK_STATUSES: readonly TaskStatus[] = ["open", "in_progress", "blocked", "done"];

export const statusLabel: Record<TaskStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  blocked: "Bloqueado",
  done: "Concluído",
};

export const statusDotClass: Record<TaskStatus, string> = {
  open: "bg-status-open",
  in_progress: "bg-status-progress",
  blocked: "bg-status-blocked",
  done: "bg-status-done",
};

export const priorityLabel: Record<TaskPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

/** Relative aging label from an ISO timestamp, coarse on purpose for a slim card. */
export function relativeAge(iso: string, now: Date = new Date(), locale: Locale = "pt-BR"): string {
  const then = new Date(iso).getTime();
  const diffMs = Math.max(0, now.getTime() - then);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return locale === "en" ? "now" : "agora";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}m`;
}

/** Cards aging past this threshold get a visual aging warning. */
export const AGING_WARNING_HOURS = 72;

export function isAging(iso: string, now: Date = new Date()): boolean {
  const then = new Date(iso).getTime();
  const hours = (now.getTime() - then) / (60 * 60 * 1000);
  return hours >= AGING_WARNING_HOURS;
}
