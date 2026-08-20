import { turnstileConfigurationAvailable } from "./turnstile.ts";

export interface ChatRuntimeEnvironment {
  minimaxApiKey: string | undefined;
  openaiApiKey: string | undefined;
  turnstileSecret: string | undefined;
  turnstileRequirement: string | undefined;
  supabaseUrl: string | undefined;
}

export type ChatRuntimeConfigurationError =
  | "model_provider_missing"
  | "embedding_provider_missing"
  | "turnstile_missing";

/** Required even for replay so a degraded hosted runtime always fails closed. */
export function chatRuntimeConfigurationError(
  environment: ChatRuntimeEnvironment,
): ChatRuntimeConfigurationError | null {
  if (!environment.minimaxApiKey) return "model_provider_missing";
  if (!environment.openaiApiKey) return "embedding_provider_missing";
  if (!turnstileConfigurationAvailable({
    secret: environment.turnstileSecret,
    requirement: environment.turnstileRequirement,
    supabaseUrl: environment.supabaseUrl,
  })) {
    return "turnstile_missing";
  }
  return null;
}
