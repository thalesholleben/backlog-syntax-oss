# Authenticated web experience

## Purpose

`apps/web` implements the V1 human-facing flows: authentication, legal acceptance, onboarding, the
backlog board, weekly Tasks, integration documentation, workspace settings and privacy self-service. Its critical path is tested against the
real API and PostgreSQL stack.

## Routes

| Route | Indexing | Purpose |
| --- | --- | --- |
| `/entrar`, `/cadastro`, `/aceitar-termos` | noindex | Better Auth email/password, feature-flagged Google and mandatory legal acceptance |
| `/recuperar-senha`, `/recuperar-senha/redefinir` | noindex | Honest unavailable state until an email adapter is configured |
| `/consent` | noindex | MCP OAuth scope consent |
| `/onboarding` | noindex | 3-step wizard: session check, workspace pick/create, project pick/create |
| `/w/:workspaceSlug` | noindex | The board, scoped to the whole workspace |
| `/w/:workspaceSlug/projetos/:projectSlug` | noindex | The same board, pre-filtered to one project |
| `/w/:workspaceSlug/tasks` | noindex | Weekly agenda with six day columns, independent due dates and an unscheduled queue |
| `/w/:workspaceSlug/documentacao` | noindex | In-product setup guide for REST, remote MCP and contextual WebMCP |
| `/w/:workspaceSlug/configuracoes/{perfil,workspace,membros,agentes,mcp,privacidade}` | noindex | Profile, workspace summary, membership, service accounts/tokens, MCP setup, LGPD rights |

## Architecture

- `lib/auth-client.ts` wraps `better-auth/react`, talking directly to
  `${NEXT_PUBLIC_API_URL}/api/auth/*` with the session cookie. The browser session is never used
  to mint or forward an MCP token (ADR 0002/0009).
- `lib/api/*.ts` is a typed REST client. Task mutations reuse the exact shared Zod input schemas
  from `@backlog-syntax/contracts` as the request body, and duplicate `expectedVersion` onto the
  `If-Match` header per ADR 0005. Every mutation takes an `Idempotency-Key`; `lib/query-client.tsx`
  disables TanStack Query's automatic mutation retry so a resubmission is always an explicit,
  idempotent action, never a blind retry.
- Task responses include the active `claimedBy` projection. The board never infers ownership from
  task text.
- `lib/webmcp/` is the ADR 0008 progressive-enhancement adapter. It feature-detects
  `document.modelContext.registerTool`, registers `list_tasks`/`create_task`/`update_task_status`/`schedule_task`
  scoped to the open project, and is a no-op in any browser without the (experimental, unstable)
  API.
- The board is workspace-wide, not project-wide: one shared query follows every opaque
  `GET /tasks` cursor in pages of 100 before it feeds the columns, header KPIs, rail, aging chart
  and weekly agenda. Project and owner become client-side filters
  (`components/backlog/backlog-view.tsx`), and `lib/backlog/view-model.ts` holds every shared
  derivation as a pure function. Missing/repeated cursors and snapshots above the current
  10,000-task safety ceiling fail visibly instead of producing partial totals or an unbounded
  request loop.
- Ownership on the board is the active claim, not a text field: `service_account` reads as
  "Agentes", `user` as "Pessoas", and no claim as "Livres".
- Board DnD follows the `kanban-style` skill: `@dnd-kit/core` with Pointer/Touch/Keyboard sensors,
  `DragOverlay` via `createPortal`, `MeasuringStrategy.Always`, and PT-BR accessibility
  announcements. The KeyboardSensor is restricted to `Space` (not the dnd-kit default of
  `Space`+`Enter`) so `Enter` stays native to the card's disclosure button, which doubles as the
  drag handle. The status `<select>` inside the open card is the required non-drag alternative.
- A card is a disclosure, not a link: collapsed it shows owner, project, age and title; open it
  shows description, dates, status, priority, the event trail and a delete action, and its drag
  listeners come off so the text inside stays selectable. The collapsed sheet is `inert`, so it is
  out of the tab order and out of the accessibility tree.
- `components/backlog/task-drawer.tsx` keeps the full record: claim, extend, release, handoff,
  comment and title/description editing. It opens from "Ficha completa" inside the card.
- `components/tasks/tasks-view.tsx` is a second projection over the same workspace query. A task's
  `scheduledDate` controls its weekly column while `dueDate` remains its deadline; moving a card
  never changes the deadline. Saturday and Sunday intentionally share one column. Tasks without a
  day in the visible week remain available in the unscheduled rail.
- The authenticated shell uses compact top navigation on tablet/desktop and a fixed four-item
  bottom bar on mobile. The agenda itself is six columns on desktop, three on tablet, and a
  horizontal snap surface on narrow screens, with native selects as the keyboard/touch alternative
  to drag and drop. `AppShell` owns the only `<main>` landmark; the board and weekly agenda are
  named sections. The agenda clips only its outer envelope while preserving native horizontal
  scrolling inside the weekly grid.
- `components/documentation/documentation-view.tsx` resolves authenticated workspace context and
  delegates to the server-compatible shared content component. Every endpoint comes from
  `NEXT_PUBLIC_API_URL`, and the page links to the generated Scalar/OpenAPI reference instead of
  duplicating the complete REST contract in the web app. The same content also powers the public
  `/documentacao` route with explicit placeholders.

## Integration status

Login and signup entry pages verify the existing session directly with Better Auth,
bypassing cookie/HTTP session caches. A valid session opens the first accessible
workspace, or onboarding if none exists; missing legal acceptance goes to its own
screen. The public logo still opens the landing page. Expired/revoked sessions show
the original form, without changing cookie scope, expiration or API authorization.
If session verification fails or exceeds four seconds, a non-blocking warning and
retry accompany the usable form. If the session is confirmed but workspace loading
fails, retry that step without pretending the user needs to log in again.
Switching accounts uses the existing **Sair** menu in the authenticated app, which
awaits sign-out before opening login. The auth page's workspace-error state currently
offers retry only, not that account menu. No bypass query parameter or E2E-only auth behavior was added;
the existing unused `NEXT_PUBLIC_E2E_FIXTURES` flag remains unused.

The web client and OpenAPI use the canonical `/v1/workspaces/:workspaceId/...` routes. Better Auth
is mounted at `/api/auth/*`; service accounts and one-time PAT secrets use the real API. Account
and workspace exports return JSON synchronously. Account deletion is atomic, revokes the identity
and memberships, and refuses deletion while the requester is the only owner of an active
workspace.

## Theme

The board honours a light/dark choice stored in `localStorage` under `bl-tema` and applied as
`data-tema` on `<html>` by a blocking inline script in `app/layout.tsx`, so the page never paints
the wrong theme first. With no stored choice, `prefers-color-scheme` decides. Every token is
declared three times in `app/globals.css` (light default, system dark, explicit dark) because a
selector cannot inherit from a media query.

## Validation

```bash
pnpm --filter @backlog-syntax/web typecheck
pnpm --filter @backlog-syntax/web test
pnpm --filter @backlog-syntax/web build
pnpm --filter @backlog-syntax/web e2e
pnpm docker:test
```

The narrow UI suite may use route fixtures. `pnpm docker:test` additionally runs
`real-stack.spec.ts` against the web, API and PostgreSQL containers without request interception.
