"use client";

import { useI18n } from "@/lib/i18n/provider";
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
import { errorMessage } from "@/lib/i18n/errors";
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
  const { t } = useI18n();

  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugTaken, setSlugTaken] = useState(false);

  const create = useMutation({
    mutationFn: (input: { name: string; slug: string }) =>
      createProject(workspaceId, input, newIdempotencyKey()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspace-context", workspaceId] });
      close();
    },
    onError: (error: unknown) => {
      // O 409 nomeia a colisao junto ao campo. O toast generico diria "conflita com o
      // estado atual", que e verdade e nao ajuda ninguem a escolher outro identificador.
      if (error instanceof ApiError && error.status === 409) {
        setSlugTaken(true);
        return;
      }
      notify("error", errorMessage(error, t));
    },
  });

  function close() {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setSlugTaken(false);
    onClose();
  }

  const finalSlug = slugTouched ? slug : toSlug(name);

  return (
    <BacklogDialog
      open={open}
      onClose={close}
      eyebrow={t("Backlog · projetos")}
      title={t("Criar um projeto")}
      intro={t(
        "Projeto é o recorte que a lateral usa para filtrar o quadro. O identificador entra na URL e nas chamadas do agente, então ele vale mais curto do que bonito.",
      )}
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
            {t("Nome")}
          </label>
          <input
            id="np-nome"
            required
            maxLength={120}
            autoComplete="off"
            value={name}
            onChange={(event) => {
              setSlugTaken(false);
              setName(event.target.value);
            }}
            placeholder={t("Ex.: Cliente Acme")}
            className={fieldControl}
          />
        </div>

        <div className="mt-[18px] flex flex-col gap-[7px]">
          <label htmlFor="np-slug" className={fieldLabel}>
            {t("Identificador")}
          </label>
          <input
            id="np-slug"
            required
            maxLength={80}
            autoComplete="off"
            value={finalSlug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlugTaken(false);
              setSlug(toSlug(event.target.value));
            }}
            placeholder={t("cliente-acme")}
            className={`${fieldControl} font-mono`}
          />
          <p className="text-[10.5px] leading-[1.45] text-faint">
            {t(
              "Minúsculas, números e hífen. Preenchido a partir do nome enquanto você não editar.",
            )}
          </p>
          {slugTaken ? (
            <p role="alert" className="text-[10.5px] font-bold leading-[1.45] text-danger">
              {t("Já existe um projeto com este identificador. Escolha outro.")}
            </p>
          ) : null}
        </div>

        <div className={dialogActions}>
          <button type="button" onClick={close} className={cancelButton}>
            {t("Cancelar")}
          </button>
          <button type="submit" disabled={create.isPending} className={submitButton}>
            {create.isPending ? "Criando…" : t("Criar projeto")}
          </button>
        </div>
      </form>
    </BacklogDialog>
  );
}
