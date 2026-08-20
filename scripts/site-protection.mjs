export function scopedSiteProtectionHeaders(requestUrl, siteUrl, bypassSecret) {
  const secret = bypassSecret?.trim() ?? "";
  if (!secret) return {};

  try {
    if (new URL(requestUrl).origin !== new URL(siteUrl).origin) return {};
  } catch {
    return {};
  }

  return { "x-vercel-protection-bypass": secret };
}
