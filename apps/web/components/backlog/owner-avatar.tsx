import { OWNER_INITIAL, OWNER_LABEL, type Owner } from "@/lib/backlog/view-model";
import { cn } from "@/lib/cn";

const gradients: Record<Owner, string> = {
  human: "bg-[linear-gradient(140deg,#f09466,#d9612f)] text-white",
  agent: "bg-[linear-gradient(140deg,#8b8df5,#4f52d8)] text-white",
  free: "bg-ink-3 text-ink-faint",
};

/** Disco com a inicial de quem carrega a tarefa. Uma letra, como no quadro de origem. */
export function OwnerAvatar({ owner, className }: { owner: Owner; className?: string }) {
  return (
    <span
      title={OWNER_LABEL[owner]}
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-mono font-extrabold leading-none",
        gradients[owner],
        className ?? "size-[17px] text-[8px]",
      )}
    >
      <span className="sr-only">{OWNER_LABEL[owner]}</span>
      <span aria-hidden="true">{OWNER_INITIAL[owner]}</span>
    </span>
  );
}
