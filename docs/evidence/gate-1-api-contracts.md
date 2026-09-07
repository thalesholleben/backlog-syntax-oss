# Gate 1 API and contracts evidence

Historical snapshot: this document records the original Gate 1 surface. See
[Integrated V1 evidence](integration-v1.md) for the current runtime.

Date: 2026-08-31

Scope: `packages/contracts`, `apps/api`, versioned OpenAPI and the API runtime image.

## Results

| Check | Command | Result |
| --- | --- | --- |
| Frozen install | `pnpm install --frozen-lockfile` | Passed |
| Format and lint | `pnpm exec biome check apps/api packages/contracts package.json tsconfig.base.json biome.json` | Passed, 30 files checked |
| TypeScript strict | `pnpm --filter @backlog-syntax/api typecheck` | Passed |
| Contract tests | `pnpm --filter @backlog-syntax/contracts test` | Passed, 1 file and 3 tests |
| Foundation test run | `pnpm --filter @backlog-syntax/api test` | Passed, 4 foundation files and 15 tests discovered by the workspace runner |
| OpenAPI drift | `pnpm --filter @backlog-syntax/api openapi:check` | Passed |
| API build | `pnpm --filter @backlog-syntax/api build` | Passed |
| Whitespace | `git diff --check` | Passed |
| Container build | `docker build --file apps/api/Dockerfile --tag backlog-syntax-api:gate1 .` | Passed |
| Container smoke | Run image on `127.0.0.1:18787`, request `/health`, inspect configured user | Passed, `health=ok user=node` |

## Proven behavior

- The same workspace context use case is exercised through separate REST and MCP presenters.
- The executable equivalence scenario asserts the same structured result on both surfaces.
- The public contract freezes RFC 9457 errors, opaque cursor pagination, scopes and ten core MCP tool schemas.
- The Gate 1 runtime exposes only `get_workspace_context`; the other nine tool contracts are frozen but intentionally not implemented yet.
- The test principal resolver is disabled unless `ALLOW_TEST_PRINCIPAL=true`. Product authentication is not part of this gate.
- `/health` remains independent from PostgreSQL. `/ready` checks both the auth and app pools.
- MCP rejects an unexpected Origin and Host before tool execution.
- The image runs as the built-in non-root `node` user.

## Artifacts

- `openapi/openapi.json`
- `apps/api/Dockerfile`
- `apps/api/test/equivalence.test.ts`
- `apps/api/test/http.test.ts`
- `packages/contracts/test/contracts.test.ts`
