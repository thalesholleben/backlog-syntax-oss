import type { BoardTask } from "@/lib/backlog/board-task";
import type { TaskStatus } from "@/lib/domain-types";

/**
 * Derivações puras do quadro. Ficam fora dos componentes porque são o que a
 * lateral, o cabeçalho e o gráfico de envelhecimento leem em comum: se cada um
 * calculasse a própria contagem, dois painéis da mesma tela discordariam.
 */

export const MS_DAY = 86_400_000;

export interface ColumnSpec {
  key: TaskStatus;
  label: string;
  empty: string;
}

export const COLUMNS: readonly ColumnSpec[] = [
  { key: "open", label: "Aberto", empty: "nada aqui" },
  { key: "in_progress", label: "Andamento", empty: "nada em execução" },
  { key: "blocked", label: "Bloqueado", empty: "nada travado" },
  { key: "done", label: "Concluído", empty: "nada fechado ainda" },
];

/** Quem está com a tarefa agora. Sem claim ativo ela não é de ninguém. */
export type Owner = "human" | "agent" | "free";

export const OWNER_LABEL: Record<Owner, string> = {
  human: "Pessoas",
  agent: "Agentes",
  free: "Livres",
};

/** Inicial no avatar. Uma letra só, como no quadro de origem. */
export const OWNER_INITIAL: Record<Owner, string> = {
  human: "P",
  agent: "A",
  free: "·",
};

export function ownerOf(task: BoardTask): Owner {
  if (!task.claimedBy) return "free";
  return task.claimedBy.subjectType === "service_account" ? "agent" : "human";
}

export function startOfToday(now: Date = new Date()): Date {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  return day;
}

/** Dias inteiros desde a criação. É a idade que o quadro mostra no card. */
export function ageInDays(iso: string, today: Date = startOfToday()): number {
  const created = new Date(iso);
  if (Number.isNaN(created.getTime())) return 0;
  created.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - created.getTime()) / MS_DAY));
}

export function pluralDays(days: number): string {
  return days === 1 ? "1 dia" : `${days} dias`;
}

/** dd/mm, que é o formato curto usado nas etiquetas do quadro. */
export function shortDate(iso: string | null | undefined): string {
  const [year, month, day] = String(iso ?? "")
    .slice(0, 10)
    .split("-");
  return year && month && day ? `${day}/${month}` : "sem data";
}

export function dateTimePt(iso: string): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return shortDate(iso);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value);
}

/** Acima disso a etiqueta do card fica vermelha e a task entra na faixa crítica. */
export const STALE_LIMIT_DAYS = 14;

export interface AgeBand {
  label: string;
  min: number;
  max: number;
  color: string;
}

export const AGE_BANDS: readonly AgeBand[] = [
  { label: "0 a 2 dias", min: 0, max: 2, color: "var(--status-done)" },
  { label: "3 a 7 dias", min: 3, max: 7, color: "var(--status-open)" },
  { label: "8 a 14 dias", min: 8, max: 14, color: "var(--warn)" },
  { label: "mais de 14", min: 15, max: Number.POSITIVE_INFINITY, color: "var(--status-blocked)" },
];

/**
 * Percentil por posto mais próximo. Com poucas tarefas, interpolar inventa um
 * número que não corresponde a nenhuma delas.
 */
export function percentile(sortedDays: readonly number[], quantile: number): number {
  if (sortedDays.length === 0) return 0;
  const index = Math.max(0, Math.ceil(quantile * sortedDays.length) - 1);
  return sortedDays[index] ?? 0;
}

export interface AgedTask {
  task: BoardTask;
  owner: Owner;
  days: number;
}

export function withAge(tasks: readonly BoardTask[], today: Date = startOfToday()): AgedTask[] {
  return tasks.map((task) => ({
    task,
    owner: ownerOf(task),
    days: ageInDays(task.createdAt, today),
  }));
}

/** Filtro de texto do cabeçalho: título, descrição e motivo do bloqueio. */
export function matchesSearch(task: BoardTask, query: string): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [task.title, task.description, task.blockedReason]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(term);
}
