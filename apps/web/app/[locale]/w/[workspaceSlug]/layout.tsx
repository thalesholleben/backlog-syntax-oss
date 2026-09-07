import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { AppProviders } from "@/components/providers/app-providers";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null, languages: {} },
};

export default function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AppProviders>
      <AppShell>{children}</AppShell>
    </AppProviders>
  );
}
