"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { AppQueryProvider } from "@/lib/query-client";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppQueryProvider>
      <ToastProvider>{children}</ToastProvider>
    </AppQueryProvider>
  );
}
