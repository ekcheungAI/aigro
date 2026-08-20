import { defineConfig, devices } from "@playwright/test";
import { resolveE2EEnvironment } from "./playwright.environment";

const e2ePort = process.env.AIGRO_E2E_PORT ?? "3000";
const e2eEnvironment = resolveE2EEnvironment(
  process.env.AIGRO_E2E_BASE_URL,
  e2ePort,
  !process.env.CI,
  process.env.AIGRO_E2E_PROTECTION_BYPASS,
  process.env.AIGRO_E2E_CHAT === "true",
);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "line",
  use: {
    baseURL: e2eEnvironment.baseURL,
    trace: "retain-on-failure",
    ...(e2eEnvironment.storageState
      ? { storageState: e2eEnvironment.storageState }
      : {}),
  },
  ...(e2eEnvironment.globalSetup ? { globalSetup: e2eEnvironment.globalSetup } : {}),
  ...(e2eEnvironment.webServer ? { webServer: e2eEnvironment.webServer } : {}),
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
