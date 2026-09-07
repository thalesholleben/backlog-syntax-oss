"use client";

import { useRouter } from "@/lib/i18n/navigation";

import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";

/** Redirects to /entrar once the session check resolves and no session exists. */
export function useRequireSession(): ReturnType<typeof useSession> {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (!session.isPending && !session.data) {
      router.replace("/entrar");
      return;
    }
    const user = session.data?.user;
    if (
      user &&
      (!user.termsAcceptedAt || !user.privacyNoticeAcceptedAt || !user.legalNoticeVersion)
    ) {
      router.replace("/aceitar-termos");
    }
  }, [session.isPending, session.data, router]);

  return session;
}
