import { defineConfig, devices } from "@playwright/test";

const runsAgainstDocker = process.env.RUN_REAL_STACK === "true";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.WEB_E2E_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  ...(runsAgainstDocker
    ? {}
    : {
        webServer: {
          command: "pnpm build && pnpm start",
          url: "http://127.0.0.1:3000",
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      }),
});
