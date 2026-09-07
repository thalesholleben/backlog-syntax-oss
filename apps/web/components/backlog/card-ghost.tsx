import { OwnerAvatar } from "@/components/backlog/owner-avatar";
import type { BoardTask } from "@/lib/backlog/board-task";
import type { Owner } from "@/lib/backlog/view-model";

/**
 * Imagem que segue o cursor no arrasto. É só o topo do card: a ficha aberta
 * dentro da imagem de arraste só atrapalha a mira na coluna de destino.
 */
export function CardGhost({
  task,
  owner,
  projectName,
}: {
  task: BoardTask;
  owner: Owner;
  projectName: string;
}) {
  return (
    <div className="w-[260px] cursor-grabbing rounded-control border border-ink-line bg-ink-hover px-[9px] pb-[9px] pt-2 shadow-hover">
      <div className="mb-[5px] flex items-center gap-1.5">
        <OwnerAvatar owner={owner} />
        <span className="font-mono text-[9.5px] font-bold tracking-[0.05em] text-ink-faint">
          #{task.id.slice(-4)}
        </span>
        <span className="max-w-[130px] truncate rounded-full bg-ink-chip px-[7px] py-1 font-mono text-[8.5px] font-bold uppercase leading-none tracking-[0.05em] text-ink-muted">
          {projectName}
        </span>
      </div>
      <p className="line-clamp-2 text-[12.2px] font-semibold leading-[1.34] tracking-[-0.012em] text-ink-foreground">
        {task.title}
      </p>
    </div>
  );
}
