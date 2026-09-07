"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  BacklogDialog,
  cancelButton,
  dialogActions,
  fieldControl,
  fieldLabel,
  submitButton,
} from "@/components/backlog/backlog-dialog";
import { useToast } from "@/components/ui/toast";
import { ApiError, newIdempotencyKey } from "@/lib/api/client";
import { createProject } from "@/lib/api/workspaces";

/** Mesma regra do contrato: minúsculas, números e hífen. */
function toSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function NewProjectDialog({
  open,
  onClose,
  workspaceId,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const create = useMutation({
    mutationFn: (input: { name: string; slug: string }) =>
      createProject(workspaceId, input, newIdempotencyKey()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspace-context", workspaceId] });
      close();
    },
    onError: (error: unknown) => {
      notify("error", error instanceof ApiError ? error.message : "Não foi possível criar agora.");
    },
  });

  function close() {
    setName("");
    setSlug("");
    setSlugTouched(false);
    onClose();
  }

  const finalSlug = slugTouched ? slug : toSlug(name);

  return (
    <BacklogDialog
      open={open}
      onClose={close}
      eyebrow="Backlog · projetos"
      title="Criar um projeto"
      intro="Projeto é o recorte que a lateral usa para filtrar o quadro. O identificador entra na URL e nas chamadas do agente, então ele vale mais curto do que bonito."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || !finalSlug) return;
          create.mutate({ name: name.trim(), slug: finalSlug });
        }}
      >
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="np-nome" className={fieldLabel}>
            Nome
          </label>
          <input
            id="np-nome"
            required
            maxLength={120}
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Cliente Acme"
            className={fieldControl}
          />
        </div>

        <div className="mt-[18px] flex flex-col gap-[7px]">
          <label htmlFor="np-slug" className={fieldLabel}>
            Identificador
          </label>
          <input
            id="np-slug"
            required
            maxLength={80}
            autoComplete="off"
            value={finalSlug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(toSlug(event.target.value));
            }}
            placeholder="cliente-acme"
            className={`${fieldControl} font-mono`}
          />
          <p className="text-[10.5px] leading-[1.45] text-faint">
            Minúsculas, números e hífen. Preenchido a partir do nome enquanto você não editar.
          </p>
        </div>

        <div className={dialogActions}>
          <button type="button" onClick={close} className={cancelButton}>
            Cancelar
          </button>
          <button type="submit" disabled={create.isPending} className={submitButton}>
            {create.isPending ? "Criando…" : "Criar projeto"}
          </button>
        </div>
      </form>
    </BacklogDialog>
  );
}
