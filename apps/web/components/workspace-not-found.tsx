import Link from "next/link";

export function WorkspaceNotFound({ fallbackSlug }: { fallbackSlug?: string | undefined }) {
  const href = fallbackSlug ? `/w/${fallbackSlug}` : "/onboarding";

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">Workspace não encontrado</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Este endereço não pertence à sua conta ou o workspace deixou de existir.
      </p>
      <Link
        href={href}
        className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full bg-accent px-4 text-sm font-bold text-accent-foreground hover:brightness-95"
      >
        {fallbackSlug ? "Ir para meu workspace" : "Criar um workspace"}
      </Link>
    </div>
  );
}
