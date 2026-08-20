import {
  chatRuntimeConfigurationError,
  type ChatRuntimeEnvironment,
} from "./chat-runtime-config.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`expected ${String(expected)}, got ${String(actual)}`);
  }
}

const configured: ChatRuntimeEnvironment = {
  minimaxApiKey: "minimax-secret",
  openaiApiKey: "openai-secret",
  turnstileSecret: "turnstile-secret",
  turnstileRequirement: "true",
  supabaseUrl: "https://project.supabase.co",
};

Deno.test("chat replay requires both generation and embedding provider configuration", () => {
  assertEquals(chatRuntimeConfigurationError(configured), null);
  assertEquals(chatRuntimeConfigurationError({
    ...configured,
    minimaxApiKey: undefined,
  }), "model_provider_missing");
  assertEquals(chatRuntimeConfigurationError({
    ...configured,
    openaiApiKey: undefined,
  }), "embedding_provider_missing");
});

Deno.test("chat replay requires hosted Turnstile configuration", () => {
  assertEquals(chatRuntimeConfigurationError({
    ...configured,
    turnstileSecret: undefined,
    turnstileRequirement: "false",
  }), "turnstile_missing");
});
