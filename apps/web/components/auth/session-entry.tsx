"use client";

import { useI18n } from "@/lib/i18n/provider";
import { useRouter } from "@/lib/i18n/navigation";

import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { listWorkspaces } from "@/lib/api/workspaces";
import { authClient } from "@/lib/auth-client";

type EntryState = "checking" | "guest" | "unverified" | "workspace-error";

/** Navigation convenience only: the API still owns session validity and tenant access. */
export function SessionEntry({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  const router = useRouter();
  const [state, setState] = useState<EntryState>("checking");

  useEffect(() => {
    if (state !== "checking") return;
    const controller = new AbortController();
    let active = true;
    let hasVerifiedSession = false;
    const timeout = setTimeout(() => {
      controller.abort();
      if (active) setState(hasVerifiedSession ? "workspace-error" : "unverified");
    }, 4_000);

    async function enter() {
      try {
        // The cookie belongs to the API host. Check it there, without a cached session.
        const result = await authClient.getSession({
          query: { disableCookieCache: true },
          fetchOptions: { signal: controller.signal, cache: "no-store" },
        });
        if (!active || controller.signal.aborted) return;
        if (result.error) {
          setState(result.error.status === 401 ? "guest" : "unverified");
          return;
        }
        if (!result.data?.session || !result.data.user) {
          setState("guest");
          return;
        }
        hasVerifiedSession = true;
        const user = result.data.user;
        if (!user.termsAcceptedAt || !user.privacyNoticeAcceptedAt || !user.legalNoticeVersion) {
          router.replace("/aceitar-termos");
          return;
        }
        const workspaces = await listWorkspaces(controller.signal);
        if (!active || controller.signal.aborted) return;
        router.replace(
          workspaces[0] ? `/w/${encodeURIComponent(workspaces[0].slug)}` : "/onboarding",
        );
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setState(
          error instanceof ApiError && error.status === 401
            ? "guest"
            : hasVerifiedSession
              ? "workspace-error"
              : "unverified",
        );
      } finally {
        clearTimeout(timeout);
      }
    }
    void enter();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [router, state]);

  if (state === "checking") {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-3xl font-bold tracking-[-0.03em]">
          {t("Só um instante")}
        </h1>
        <p role="status" className="text-sm text-muted">
          {t("Verificando sua sessão…")}
        </p>
      </div>
    );
  }

  return (
    <>
      {state === "unverified" || state === "workspace-error" ? (
        <div className="mb-5 space-y-3">
          {state === "workspace-error" ? (
            <h1 className="font-display text-3xl font-bold tracking-[-0.03em]">
              {t("Abrir workspace")}
            </h1>
          ) : null}
          <p role="alert" className="text-sm text-muted">
            {state === "workspace-error"
              ? t(
                  "Sua sessão está ativa, mas não foi possível abrir seus workspaces. Tente novamente.",
                )
              : t("Não foi possível verificar sua sessão. Tente novamente ou entre com sua conta.")}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setState("checking");
            }}
          >
            {t("Tentar novamente")}
          </Button>
        </div>
      ) : null}
      {state === "guest" || state === "unverified" ? children : null}
    </>
  );
}
