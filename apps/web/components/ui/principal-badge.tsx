import { Bot, User } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SubjectType } from "@/lib/domain-types";

const labels: Record<SubjectType, string> = {
  user: "Pessoa",
  service_account: "Agente",
};

const icons: Record<SubjectType, typeof User> = {
  user: User,
  service_account: Bot,
};

export function PrincipalBadge({
  subjectType,
  name,
  className,
}: {
  subjectType: SubjectType;
  name?: string | undefined;
  className?: string | undefined;
}) {
  const Icon = icons[subjectType];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-bold text-muted",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3" />
      {name ?? labels[subjectType]}
    </span>
  );
}
