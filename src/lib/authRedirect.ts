const PRODUCTION_SITE_URL = "https://aigro-blue.vercel.app";

function normaliseOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

/**
 * Keep every Supabase auth flow on the canonical AIGRO domain in production.
 * Local development remains on localhost so OAuth can return to the dev server.
 */
export function resolveAuthRedirectUrl({
  configuredSiteUrl,
  currentOrigin,
  isProduction,
}: {
  configuredSiteUrl?: string;
  currentOrigin: string;
  isProduction: boolean;
}): string {
  const configured = configuredSiteUrl?.trim();
  if (configured) return normaliseOrigin(configured);
  return isProduction ? PRODUCTION_SITE_URL : normaliseOrigin(currentOrigin);
}

export function getAuthRedirectUrl(path = "/"): string {
  const baseUrl = resolveAuthRedirectUrl({
    configuredSiteUrl: import.meta.env.VITE_SITE_URL as string | undefined,
    currentOrigin: window.location.origin,
    isProduction: import.meta.env.PROD,
  });
  const safePath = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return new URL(safePath, `${baseUrl}/`).toString();
}
