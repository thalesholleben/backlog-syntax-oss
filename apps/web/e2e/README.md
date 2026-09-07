# Browser test modes

The regular suite starts a production Next.js build. Public-page tests are real; narrow UI tests
may intercept API calls to isolate client behavior.

`english.spec.ts` validates HTML without JavaScript, canonical/hreflang metadata, public-only
Markdown negotiation, language switching with auth parameters, and English workspace flows
with fictional API fixtures. Its responsive cases cover 320, 390, 820 and 1440px.
These fixtures establish UI behavior, not a real production login or database write.

`real-stack.spec.ts` never uses route fixtures. `pnpm docker:test` starts the web, API and
PostgreSQL containers, then drives signup, workspace creation, project creation and task creation
through the browser. Reloading the board proves that the API persisted the task in PostgreSQL.
