import type { Metadata } from "next";
import { LegalAcceptanceForm } from "@/components/auth/legal-acceptance-form";

export const metadata: Metadata = { title: "Confirmar termos", robots: { index: false } };

export default function LegalAcceptancePage() {
  return <LegalAcceptanceForm />;
}
