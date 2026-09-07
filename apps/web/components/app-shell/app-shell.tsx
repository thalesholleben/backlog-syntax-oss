"use client";

import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ProductBrand } from "@/components/product-brand";
import { Menu, MenuItem } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { useActiveWorkspace } from "@/lib/use-active-workspace";
import { useRequireSession } from "@/lib/use-require-session";
import { useWebMcpTools } from "@/lib/webmcp/use-webmcp-tools";

/**
 * Barra fina de conta e workspace. Tudo que é do quadro (busca, filtros, tema,
 * nova tarefa) vive no cabeçalho do próprio quadro, para o shell não competir
 * com ele por atenção nem repetir controle.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const params = useParams<{ workspaceSlug: string; projectSlug?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const session = useRequireSession();
  const { summary, workspacesQuery, contextQuery } = useActiveWorkspace(params.workspaceSlug);

  const activeProject =
    contextQuery.data?.projects.find((project) => project.slug === params.projectSlug) ??
    contextQuery.data?.projects[0];
  useWebMcpTools(
    summary && activeProject ? { workspaceId: summary.id, projectId: activeProject.id } : null,
  );

  if (session.isPending || !session.data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-20 md:pb-0">
      <header className="border-b border-line bg-surface">
        <div className="flex min-h-14 items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="text-muted hover:text-foreground max-sm:hidden">
            <ProductBrand />
          </Link>
          <span aria-hidden="true" className="h-5 w-px bg-line max-sm:hidden" />

          <Menu
            trigger={({ toggle, open }) => (
              <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                className="flex min-h-10 items-center gap-2 rounded-full border border-line px-3 text-sm font-bold hover:bg-panel"
              >
                {summary?.name ?? "Workspace"}
                <ChevronDown aria-hidden="true" className="size-4 text-muted" />
              </button>
            )}
          >
            {(close) => (
              <>
                {workspacesQuery.data?.map((workspace) => (
                  <MenuItem
                    key={workspace.id}
                    onSelect={() => {
                      close();
                      router.push(`/w/${workspace.slug}`);
                    }}
                  >
                    {workspace.name}
                  </MenuItem>
                ))}
                <MenuItem
                  onSelect={() => {
                    close();
                    router.push("/onboarding");
                  }}
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Novo workspace
                </MenuItem>
              </>
            )}
          </Menu>

          {summary ? (
            <nav aria-label="Áreas do workspace" className="ml-2 hidden items-center gap-1 md:flex">
              <AppNavLink
                href={`/w/${summary.slug}`}
                label="Backlog"
                icon={LayoutDashboard}
                active={
                  pathname === `/w/${summary.slug}` ||
                  pathname.startsWith(`/w/${summary.slug}/projetos/`)
                }
              />
              <AppNavLink
                href={`/w/${summary.slug}/tasks`}
                label="Tasks"
                icon={CalendarDays}
                active={pathname.startsWith(`/w/${summary.slug}/tasks`)}
              />
              <AppNavLink
                href={`/w/${summary.slug}/documentacao`}
                label="Documentação"
                icon={BookOpen}
                active={pathname.startsWith(`/w/${summary.slug}/documentacao`)}
              />
            </nav>
          ) : null}

          <div className="ml-auto flex items-center gap-1.5">
            {summary ? (
              <Link
                href={`/w/${summary.slug}/configuracoes`}
                className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-panel hover:text-foreground max-sm:hidden"
                aria-label="Configurações do workspace"
              >
                <Settings aria-hidden="true" className="size-5" />
              </Link>
            ) : null}

            <Menu
              align="end"
              trigger={({ toggle, open }) => (
                <button
                  type="button"
                  onClick={toggle}
                  aria-expanded={open}
                  aria-label="Menu da conta"
                  className="flex size-10 items-center justify-center rounded-full bg-contrast text-sm font-bold text-contrast-foreground"
                >
                  {session.data?.user.name?.[0]?.toUpperCase() ?? "?"}
                </button>
              )}
            >
              {(close) => (
                <>
                  <div className="px-3 py-2 text-sm">
                    <p className="font-bold">{session.data?.user.name}</p>
                    <p className="text-muted">{session.data?.user.email}</p>
                  </div>
                  <MenuItem
                    destructive
                    onSelect={async () => {
                      close();
                      await authClient.signOut();
                      router.push("/entrar");
                    }}
                  >
                    <LogOut aria-hidden="true" className="size-4" />
                    Sair
                  </MenuItem>
                </>
              )}
            </Menu>
          </div>
        </div>
      </header>

      <main id="conteudo">{children}</main>

      {summary ? (
        <nav
          aria-label="Navegação principal"
          className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-[1.35rem] border border-line bg-surface/95 p-1.5 shadow-pop backdrop-blur-md md:hidden"
        >
          <MobileNavLink
            href={`/w/${summary.slug}`}
            label="Backlog"
            icon={LayoutDashboard}
            active={
              pathname === `/w/${summary.slug}` ||
              pathname.startsWith(`/w/${summary.slug}/projetos/`)
            }
          />
          <MobileNavLink
            href={`/w/${summary.slug}/tasks`}
            label="Tasks"
            icon={CalendarDays}
            active={pathname.startsWith(`/w/${summary.slug}/tasks`)}
          />
          <MobileNavLink
            href={`/w/${summary.slug}/documentacao`}
            label="Docs"
            icon={BookOpen}
            active={pathname.startsWith(`/w/${summary.slug}/documentacao`)}
          />
          <MobileNavLink
            href={`/w/${summary.slug}/configuracoes`}
            label="Ajustes"
            icon={Settings}
            active={pathname.startsWith(`/w/${summary.slug}/configuracoes`)}
          />
        </nav>
      ) : null}
    </div>
  );
}

function AppNavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold ${
        active ? "bg-foreground text-background" : "text-muted hover:bg-panel hover:text-foreground"
      }`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </Link>
  );
}

function MobileNavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-[1rem] text-[9px] font-bold ${
        active ? "bg-accent text-accent-foreground" : "text-muted"
      }`}
    >
      <Icon aria-hidden="true" className="size-[18px]" />
      {label}
    </Link>
  );
}
