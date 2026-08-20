export interface E2EEnvironmentConfig {
  baseURL: string;
  globalSetup?: string;
  storageState?: string;
  webServer?: {
    command: string;
    url: string;
    reuseExistingServer: boolean;
  };
}

export const E2E_PROTECTION_STORAGE_STATE = "test-results/.beta-protection-storage.json";

export function resolveE2EEnvironment(
  remoteBaseUrl: string | undefined,
  port = "3000",
  reuseExistingServer = true,
  protectionBypass: string | undefined = undefined,
  requireProtectionBypass = false,
): E2EEnvironmentConfig {
  const normalizedRemoteBaseUrl = remoteBaseUrl?.trim().replace(/\/+$/, "");
  if (normalizedRemoteBaseUrl) {
    const normalizedBypass = protectionBypass?.trim();
    const isBetaDomain = (() => {
      try {
        return new URL(normalizedRemoteBaseUrl).hostname === "beta.aigro.io";
      } catch {
        return false;
      }
    })();
    if ((requireProtectionBypass || isBetaDomain) && !normalizedBypass) {
      throw new Error("AIGRO_E2E_PROTECTION_BYPASS is required for protected beta tests");
    }
    return {
      baseURL: normalizedRemoteBaseUrl,
      ...(normalizedBypass
        ? {
            globalSetup: "./tests/e2e/global-setup.ts",
            storageState: E2E_PROTECTION_STORAGE_STATE,
          }
        : {}),
    };
  }

  const baseURL = `http://127.0.0.1:${port}`;
  return {
    baseURL,
    webServer: {
      command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
      url: baseURL,
      reuseExistingServer,
    },
  };
}
