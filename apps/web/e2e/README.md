# Browser test modes

The regular suite starts a production Next.js build. Public-page tests are real; narrow UI tests
may intercept API calls to isolate client behavior.

`real-stack.spec.ts` never uses route fixtures. `pnpm docker:test` starts the web, API and
PostgreSQL containers, then drives signup, workspace creation, project creation and task creation
through the browser. Reloading the board proves that the API persisted the task in PostgreSQL.
