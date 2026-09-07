import { Pool } from "pg";
import type { ApiConfig } from "../config.js";

export interface DatabasePools {
  auth: Pool;
  app: Pool;
  close(): Promise<void>;
  readiness(): Promise<boolean>;
}

function createPool(connectionString: string, config: ApiConfig, searchPath: string): Pool {
  return new Pool({
    connectionString,
    max: config.DB_POOL_MAX,
    connectionTimeoutMillis: config.DB_CONNECTION_TIMEOUT_MS,
    statement_timeout: config.DB_STATEMENT_TIMEOUT_MS,
    ssl: config.DATABASE_SSL ? { rejectUnauthorized: true } : false,
    options: `-c search_path=${searchPath}`,
  });
}

export function createDatabasePools(config: ApiConfig): DatabasePools {
  const auth = createPool(config.AUTH_DATABASE_URL, config, "auth,public");
  const app = createPool(config.APP_DATABASE_URL, config, "domain,private,public");

  return {
    auth,
    app,
    async close() {
      await Promise.all([auth.end(), app.end()]);
    },
    async readiness() {
      try {
        await Promise.all([auth.query("SELECT 1"), app.query("SELECT 1")]);
        return true;
      } catch {
        return false;
      }
    },
  };
}
