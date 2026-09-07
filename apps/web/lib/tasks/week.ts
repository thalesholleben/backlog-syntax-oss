import type { Locale } from "@/lib/i18n/routing";
import type { Task } from "@backlog-syntax/contracts";

export const DAY_MS = 86_400_000;

export interface WeekColumn {
  key: "mon" | "tue" | "wed" | "thu" | "fri" | "weekend";
  label: string;
  shortLabel: string;
  dates: readonly string[];
  scheduleDate: string;
}

function localDate(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function isoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

export function startOfWeek(reference: Date): Date {
  const date = localDate(reference);
  const weekday = date.getDay();
  date.setDate(date.getDate() - (weekday === 0 ? 6 : weekday - 1));
  return date;
}

export function addDays(value: Date, amount: number): Date {
  const date = localDate(value);
  date.setDate(date.getDate() + amount);
  return date;
}

export function weekColumns(reference: Date, locale: Locale = "pt-BR"): readonly WeekColumn[] {
  const monday = startOfWeek(reference);
  const specs = [
    ["mon", "Segunda", "SEG", 0],
    ["tue", "Terça", "TER", 1],
    ["wed", "Quarta", "QUA", 2],
    ["thu", "Quinta", "QUI", 3],
    ["fri", "Sexta", "SEX", 4],
  ] as const;
  const weekdays = specs.map(([key, label, shortLabel, offset]) => {
    const date = isoDate(addDays(monday, offset));
    return {
      key,
      label:
        locale === "en"
          ? new Intl.DateTimeFormat("en", { weekday: "long" }).format(parseIsoDate(date))
          : label,
      shortLabel: locale === "en" ? key.toUpperCase() : shortLabel,
      dates: [date],
      scheduleDate: date,
    };
  });
  const saturday = isoDate(addDays(monday, 5));
  return [
    ...weekdays,
    {
      key: "weekend",
      label: locale === "en" ? "Weekend" : "Fim de semana",
      shortLabel: locale === "en" ? "SAT–SUN" : "SÁB–DOM",
      dates: [saturday, isoDate(addDays(monday, 6))],
      scheduleDate: saturday,
    },
  ];
}

export function columnForTask(
  task: Pick<Task, "scheduledDate">,
  columns: readonly WeekColumn[],
): WeekColumn | null {
  return (
    columns.find((column) => task.scheduledDate && column.dates.includes(task.scheduledDate)) ??
    null
  );
}

export function daysFromToday(date: string, today: Date = new Date()): number {
  return Math.round((parseIsoDate(date).getTime() - localDate(today).getTime()) / DAY_MS);
}

export function shortDay(date: string, locale: Locale = "pt-BR"): string {
  const [year, month, day] = date.split("-");
  return year && month && day ? (locale === "en" ? `${month}/${day}` : `${day}/${month}`) : date;
}
