import { getI18n } from "@/lib/i18n/server";
import { redirect } from "next/navigation";

export default async function SettingsIndexPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const { href } = await getI18n();
  redirect(href(`/w/${workspaceSlug}/configuracoes/perfil`));
}
