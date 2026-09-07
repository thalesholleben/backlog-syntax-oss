"use client";

import { useI18n } from "@/lib/i18n/provider";
import { useEffect, useState } from "react";
import {
  BacklogDialog,
  cancelButton,
  dialogActions,
  fieldControl,
  fieldLabel,
  submitButton,
} from "@/components/backlog/backlog-dialog";
import type { ProjectRef } from "@/components/backlog/backlog-rail";
import { useTaskMutations } from "@/lib/backlog/use-tasks";
import type { TaskPriority } from "@/lib/domain-types";
import { priorityLabel } from "@/lib/task-presentation";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];

export function NewTaskDialog({
  open,
  onClose,
  workspaceId,
  projects,
  defaultProjectId,
  defaultScheduledDate,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  projects: ProjectRef[];
  defaultProjectId: string;
  defaultScheduledDate?: string;
}) {
  const { t } = useI18n();

  const mutations = useTaskMutations(workspaceId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [scheduledDate, setScheduledDate] = useState(defaultScheduledDate ?? "");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (open) {
      setProjectId(defaultProjectId);
      setScheduledDate(defaultScheduledDate ?? "");
    }
  }, [open, defaultProjectId, defaultScheduledDate]);

  function close() {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setScheduledDate("");
    setDueDate("");
    onClose();
  }

  return (
    <BacklogDialog
      open={open}
      onClose={close}
      eyebrow={t("Backlog · nova entrada")}
      title={t("Adicionar uma tarefa")}
      intro={t(
        "Preencha o contexto mínimo. A tarefa entra no quadro já gravada, com versão própria e trilha de eventos, visível para pessoa e agente na mesma hora.",
      )}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim() || !projectId) return;
          mutations.create.mutate(
            {
              workspaceId,
              projectId,
              title: title.trim(),
              priority,
              ...(description.trim() ? { description: description.trim() } : {}),
              ...(scheduledDate ? { scheduledDate } : {}),
              ...(dueDate ? { dueDate } : {}),
            },
            { onSuccess: close },
          );
        }}
      >
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="nt-titulo" className={fieldLabel}>
            {t("Título")}
          </label>
          <input
            id="nt-titulo"
            required
            maxLength={200}
            autoComplete="off"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("Ex.: Revisar o contrato do endpoint de tarefas")}
            className={fieldControl}
          />
        </div>

        <div className="mt-[18px] flex flex-col gap-[7px]">
          <label htmlFor="nt-resumo" className={fieldLabel}>
            {t("Resumo")}
          </label>
          <textarea
            id="nt-resumo"
            maxLength={50_000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("O que é e o que falta para essa tarefa avançar?")}
            className={`${fieldControl} min-h-[84px] resize-y`}
          />
        </div>

        <div className="mt-[18px] grid gap-[18px] sm:grid-cols-2">
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="nt-projeto" className={fieldLabel}>
              {t("Projeto")}
            </label>
            <select
              id="nt-projeto"
              required
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className={fieldControl}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="nt-prioridade" className={fieldLabel}>
              {t("Prioridade")}
            </label>
            <select
              id="nt-prioridade"
              value={priority}
              onChange={(event) => setPriority(event.target.value as TaskPriority)}
              className={fieldControl}
            >
              {PRIORITIES.map((item) => (
                <option key={item} value={item}>
                  {t(priorityLabel[item])}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-[18px] grid gap-[18px] sm:grid-cols-2">
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="nt-agendada" className={fieldLabel}>
              {t("Dia na agenda")}
            </label>
            <input
              id="nt-agendada"
              type="date"
              value={scheduledDate}
              onChange={(event) => setScheduledDate(event.target.value)}
              className={fieldControl}
            />
          </div>
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="nt-prazo" className={fieldLabel}>
              {t("Prazo")}
            </label>
            <input
              id="nt-prazo"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className={fieldControl}
            />
          </div>
        </div>

        <p className="mt-2.5 text-[10.5px] leading-[1.45] text-faint">
          {t(
            "Agenda é quando você pretende executar. Prazo é quando a tarefa vence; um não altera o outro. Quem assume registra o claim depois, com lease próprio.",
          )}
        </p>

        <div className={dialogActions}>
          <button type="button" onClick={close} className={cancelButton}>
            {t("Cancelar")}
          </button>
          <button
            type="submit"
            disabled={mutations.create.isPending || !projects.length}
            className={submitButton}
          >
            {mutations.create.isPending ? "Adicionando…" : t("Adicionar tarefa")}
          </button>
        </div>
      </form>
    </BacklogDialog>
  );
}
