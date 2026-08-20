export interface TurnstileBypassEnvironment {
  secret: string | undefined;
  requirement: string | undefined;
  supabaseUrl: string | undefined;
}

function isLoopbackSupabaseUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" &&
      (url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "[::1]");
  } catch {
    return false;
  }
}

/** Hosted Edge Functions always fail closed when the Turnstile secret is absent. */
export function canBypassTurnstile(environment: TurnstileBypassEnvironment): boolean {
  return !environment.secret &&
    environment.requirement === "false" &&
    isLoopbackSupabaseUrl(environment.supabaseUrl);
}

export function turnstileConfigurationAvailable(
  environment: TurnstileBypassEnvironment,
): boolean {
  return Boolean(environment.secret) || canBypassTurnstile(environment);
}
