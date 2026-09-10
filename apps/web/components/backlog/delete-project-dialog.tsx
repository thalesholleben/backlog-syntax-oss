"use client";

import { useI18n } from "@/lib/i18n/provider";
import { BacklogDialog, cancelButton, dialogActions } from "@/components/backlog/backlog-dialog";

/**
 * So aparece quando o projeto ainda tem tarefa. Projeto vazio se apaga direto, porque pedir
 * confirmacao para algo sem consequencia treina a pessoa a confirmar sem ler.
 */
export function DeleteProjectDialog({
  project,
  isPending,
  onConfirm,
  onClose,
}: {
  project: { id: string; name: string; tasks: number | null } | null;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();

  if (!project) return null;

  return (
    <BacklogDialog
      open
      onClose={onClose}
      eyebrow={t("Backlog · projetos")}
      title={t("Apagar {0}?", { "0": project.name })}
      intro={
        /* A contagem some quando o servidor recusou por tarefas que o quadro nao lista, as
           arquivadas. Prometer um numero que nao se sabe seria pior que nao dar numero. */
        project.tasks === null
          ? t(
              "Este projeto ainda tem tarefas, incluindo arquivadas que o quadro não lista. Apagar o projeto apaga essas tarefas junto, e isso não se desfaz pela interface.",
            )
          : t(
              "Este projeto tem {0} tarefa(s). Apagar o projeto apaga essas tarefas junto, e isso não se desfaz pela interface.",
              { "0": String(project.tasks) },
            )
      }
    >
      <div className={dialogActions}>
        <button type="button" onClick={onClose} className={cancelButton}>
          {t("Cancelar")}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="min-h-10 rounded-full border border-danger bg-danger px-[18px] text-[12.5px] font-bold text-danger-foreground hover:opacity-90 disabled:opacity-50"
        >
          {t("Apagar o projeto e as tarefas")}
        </button>
      </div>
    </BacklogDialog>
  );
}
