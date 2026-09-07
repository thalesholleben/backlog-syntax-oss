import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers/app-providers";

export const metadata: Metadata = {
  title: "Configurar workspace",
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AppProviders>{children}</AppProviders>;
}
