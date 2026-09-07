import { createPrincipalResolver, createTestPrincipalResolver } from "./auth/principal-resolver.js";
import {
  createProductAuth,
  createProtectedProductMcpEndpoint,
  type ProductAuthOptions,
} from "./auth/runtime.mjs";
import type { ApiConfig } from "./config.js";
import { createGetWorkspaceContextUseCase } from "./domain/workspace-context.js";
import { createApiApp } from "./http/app.js";
import { MockWorkspaceContextRepository } from "./infrastructure/mock-workspace-context.js";
import type { DatabasePools } from "./infrastructure/database-pools.js";
import { PostgresProductRepository } from "./infrastructure/postgres-product-repository.js";
import { createProductMcpHandler } from "./mcp/product-server.js";
import { AccountPrivacyService } from "./privacy/account-privacy-service.js";

export interface FoundationAppOptions {
  config: Pick<ApiConfig, "ALLOW_TEST_PRINCIPAL" | "PUBLIC_API_URL" | "WEB_ORIGIN">;
  readinessCheck?: () => Promise<boolean>;
}

export function createFoundationApp(options: FoundationAppOptions) {
  const getWorkspaceContext = createGetWorkspaceContextUseCase(
    new MockWorkspaceContextRepository(),
  );

  return createApiApp({
    config: options.config,
    getWorkspaceContext,
    principalResolver: createTestPrincipalResolver(options.config.ALLOW_TEST_PRINCIPAL),
    readinessCheck: options.readinessCheck ?? (async () => true),
  });
}

export function createProductApp(options: {
  config: ApiConfig;
  pools: DatabasePools;
  authOptions?: ProductAuthOptions;
}) {
  const auth = createProductAuth(options.pools.auth, options.config, options.authOptions);
  const repository = new PostgresProductRepository(options.pools.app);
  const accountPrivacyService = new AccountPrivacyService(options.pools.app, auth);
  const getWorkspaceContext = createGetWorkspaceContextUseCase(repository);
  const protectedMcpHandler = createProtectedProductMcpEndpoint(
    auth,
    options.config,
    createProductMcpHandler(repository),
  );

  return createApiApp({
    config: options.config,
    getWorkspaceContext,
    principalResolver: createPrincipalResolver({
      auth,
      appPool: options.pools.app,
      allowTestPrincipal: options.config.ALLOW_TEST_PRINCIPAL,
    }),
    authHandler: (request) => auth.handler(request),
    protectedMcpHandler,
    repository,
    accountPrivacyService,
    readinessCheck: () => options.pools.readiness(),
  });
}
