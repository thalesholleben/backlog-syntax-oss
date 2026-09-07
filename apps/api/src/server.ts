import { serve } from "@hono/node-server";
import { createProductApp } from "./app.js";
import { parseConfig } from "./config.js";
import { createDatabasePools } from "./infrastructure/database-pools.js";
import { startLeaseHousekeeping } from "./worker/lease-housekeeping.js";

const config = parseConfig(process.env);
const pools = createDatabasePools(config);
const app = createProductApp({ config, pools });

const server = serve({ fetch: app.fetch, hostname: config.API_HOST, port: config.API_PORT });
const stopHousekeeping = config.HOUSEKEEPING_ENABLED
  ? startLeaseHousekeeping(pools.app, config.HOUSEKEEPING_INTERVAL_MS)
  : () => undefined;

async function shutdown(): Promise<void> {
  stopHousekeeping();
  server.close();
  await pools.close();
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
