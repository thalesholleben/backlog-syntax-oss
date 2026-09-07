"use client";

import { useI18n } from "@/lib/i18n/provider";
import { useMutation } from "@tanstack/react-query";
import Link from "@/lib/i18n/navigation";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { deleteAccount, exportAccountData, exportWorkspaceData } from "@/lib/api/account";
import { ApiError } from "@/lib/api/client";
import { useSession } from "@/lib/auth-client";
import { useActiveWorkspace } from "@/lib/use-active-workspace";

function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function PrivacySettingsPage() {
  const { t, href } = useI18n();

  const { notify } = useToast();
  const params = useParams<{ workspaceSlug: string }>();
  const { summary } = useActiveWorkspace(params.workspaceSlug);
  const session = useSession();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");

  const accountExportMutation = useMutation({
    mutationFn: exportAccountData,
    onSuccess: (data) => {
      downloadJson(data, `backlog-syntax-conta-${data.exportedAt.slice(0, 10)}.json`);
      notify("success", t("Exportação da conta baixada."));
    },
    onError: () => notify("error", t("Não foi possível exportar a conta agora.")),
  });

  const workspaceExportMutation = useMutation({
    mutationFn: () => exportWorkspaceData(summary?.id as string),
    onSuccess: (data) => {
      downloadJson(
        data,
        `backlog-syntax-${data.workspace.slug}-${data.exportedAt.slice(0, 10)}.json`,
      );
      notify("success", t("Exportação do workspace baixada."));
    },
    onError: () => notify("error", t("Não foi possível exportar este workspace agora.")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(confirmEmail),
    onSuccess: () => {
      window.location.assign(href("/"));
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "sole_owner_workspace") {
        notify("error", t("Transfira a propriedade dos workspaces em que você é o único owner."));
        return;
      }
      if (error instanceof ApiError && error.code === "reauthentication_required") {
        notify("error", t("Entre novamente para confirmar uma exclusão sensível."));
        return;
      }
      notify("error", t("Não foi possível excluir a conta agora."));
    },
  });

  return (
    <section className="max-w-lg space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("Privacidade e LGPD")}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {t("Direitos do titular sobre seus próprios dados de conta. Veja o")}{" "}
          <Link
            href="/privacidade"
            target="_blank"
            className="font-semibold underline decoration-line underline-offset-4"
          >
            {t("aviso de privacidade")}
          </Link>{" "}
          {t("completo.")}
        </p>
      </div>

      <div className="rounded-card border border-line bg-surface p-5">
        <h2 className="font-bold">{t("Exportar meus dados")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {t(
            "Baixa imediatamente um JSON com seu perfil, metadados das suas sessões e memberships. Tokens e segredos nunca entram no arquivo.",
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            isLoading={accountExportMutation.isPending}
            onClick={() => accountExportMutation.mutate()}
          >
            {t("Baixar dados da conta")}
          </Button>
          <Button
            variant="secondary"
            disabled={!summary}
            isLoading={workspaceExportMutation.isPending}
            onClick={() => workspaceExportMutation.mutate()}
          >
            {t("Baixar workspace")}
          </Button>
        </div>
      </div>

      <div className="rounded-card border border-danger bg-surface p-5">
        <h2 className="font-bold text-danger">{t("Excluir minha conta")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {t(
            "Ação irreversível. A exclusão é bloqueada se você for o único owner de um workspace ativo. Dados dos demais membros nunca são apagados.",
          )}
        </p>
        <Button variant="danger" className="mt-4" onClick={() => setConfirmOpen(true)}>
          {t("Excluir conta")}
        </Button>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t("Confirmar exclusão de conta")}
        variant="modal"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-muted">
            {t("Digite")} <strong className="text-foreground">{t("excluir")}</strong>{" "}
            {t("e o e-mail da conta. Sua sessão precisa ter sido iniciada nos últimos 15 minutos.")}
          </p>
          <Field label={t("Confirmação")}>
            {({ inputId }) => (
              <Input
                id={inputId}
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
              />
            )}
          </Field>
          <Field label={t("E-mail da conta")}>
            {({ inputId }) => (
              <Input
                id={inputId}
                type="email"
                value={confirmEmail}
                onChange={(event) => setConfirmEmail(event.target.value)}
              />
            )}
          </Field>
          <Button
            variant="danger"
            className="w-full"
            disabled={
              confirmText !== t("excluir") ||
              confirmEmail.toLowerCase() !== session.data?.user.email.toLowerCase()
            }
            isLoading={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            {t("Confirmar exclusão")}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
