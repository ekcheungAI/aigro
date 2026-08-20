import { request } from "@playwright/test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { E2E_PROTECTION_STORAGE_STATE } from "../../playwright.environment";

export default async function globalSetup() {
  const baseURL = process.env.AIGRO_E2E_BASE_URL?.trim().replace(/\/+$/, "");
  const bypassSecret = process.env.AIGRO_E2E_PROTECTION_BYPASS?.trim();
  if (!baseURL || !bypassSecret) return undefined;

  const expectedHost = new URL(baseURL).hostname;
  const storageStatePath = resolve(process.cwd(), E2E_PROTECTION_STORAGE_STATE);
  const api = await request.newContext();

  try {
    // Keep the secret on one explicit same-origin request. Disabling redirects
    // prevents a custom header from following an unexpected cross-origin hop.
    const response = await api.get(baseURL, {
      headers: {
        "x-vercel-protection-bypass": bypassSecret,
        "x-vercel-set-bypass-cookie": "true",
      },
      maxRedirects: 0,
    });
    if (![200, 302, 303, 307, 308].includes(response.status())) {
      throw new Error(`beta_protection_bootstrap_failed_http_${response.status()}`);
    }

    const state = await api.storageState();
    const hasSameOriginCookie = state.cookies.some((cookie) => {
      const cookieDomain = cookie.domain.replace(/^\./, "");
      return expectedHost === cookieDomain || expectedHost.endsWith(`.${cookieDomain}`);
    });
    if (!hasSameOriginCookie) throw new Error("beta_protection_bootstrap_cookie_missing");

    mkdirSync(dirname(storageStatePath), { recursive: true });
    writeFileSync(storageStatePath, JSON.stringify(state), { mode: 0o600 });
  } finally {
    await api.dispose();
  }

  return async () => {
    rmSync(storageStatePath, { force: true });
  };
}
