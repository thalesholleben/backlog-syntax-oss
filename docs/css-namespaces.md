# CSS namespaces (apps/web)

Styling is Tailwind v4 utility classes applied inline via `className`. Custom, hand-written CSS
rules live only in `apps/web/app/globals.css` and are always prefixed `bl-` (Backlog Syntax) so
they can never collide with a Tailwind utility or a future generic name.

| Namespace root | Component | Main location |
| --- | --- | --- |
| `bl-dialog` | Native `<dialog>` reset used by modal and drawer primitives | `apps/web/components/ui/dialog.tsx`, `apps/web/app/globals.css` |
| `bl-scroll` | Thin custom scrollbar (kanban columns, drawers) | `apps/web/app/globals.css` |

Before adding a new hand-written CSS root, check this table for reuse and register the new root
in the same change. Do not reserve names ahead of need.
