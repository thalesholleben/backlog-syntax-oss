"use client";

import { useI18n } from "@/lib/i18n/provider";
import { useRouter } from "@/lib/i18n/navigation";

import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient, useSession } from "@/lib/auth-client";

export default function ProfileSettingsPage() {
  const { t } = useI18n();

  const session = useSession();
  const router = useRouter();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">{t("Perfil")}</h1>
        <p className="mt-1 text-sm text-muted">{t("Sua identidade nesta conta.")}</p>
      </div>

      {session.isPending ? (
        <Skeleton className="h-24 w-full max-w-sm" />
      ) : (
        <div className="max-w-sm space-y-4 rounded-card border border-line bg-surface p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">{t("Nome")}</p>
            <p className="mt-1 font-semibold">{session.data?.user.name}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">{t("E-mail")}</p>
            <p className="mt-1 font-semibold">{session.data?.user.email}</p>
          </div>
        </div>
      )}

      <div className="rounded-card border border-line bg-surface p-5">
        <ChangePasswordForm />
      </div>

      <Button
        variant="secondary"
        onClick={async () => {
          await authClient.signOut();
          router.push("/entrar");
        }}
      >
        {t("Sair da conta")}
      </Button>
    </section>
  );
}
