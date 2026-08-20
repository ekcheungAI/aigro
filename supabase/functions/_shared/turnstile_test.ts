import {
  canBypassTurnstile,
  turnstileConfigurationAvailable,
} from "./turnstile.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`expected ${String(expected)}, got ${String(actual)}`);
  }
}

Deno.test("Turnstile bypass is rejected for every hosted Supabase URL", () => {
  for (const supabaseUrl of [
    "https://project.supabase.co",
    "https://beta-api.aigro.io",
    "http://localhost.evil.example",
    undefined,
  ]) {
    assertEquals(canBypassTurnstile({
      secret: undefined,
      requirement: "false",
      supabaseUrl,
    }), false);
  }
});

Deno.test("Turnstile bypass requires both an explicit opt-out and a loopback Supabase URL", () => {
  assertEquals(canBypassTurnstile({
    secret: undefined,
    requirement: "false",
    supabaseUrl: "http://127.0.0.1:54321",
  }), true);
  assertEquals(canBypassTurnstile({
    secret: undefined,
    requirement: "false",
    supabaseUrl: "http://localhost:54321",
  }), true);
  assertEquals(canBypassTurnstile({
    secret: undefined,
    requirement: undefined,
    supabaseUrl: "http://localhost:54321",
  }), false);
  assertEquals(canBypassTurnstile({
    secret: "configured-secret",
    requirement: "false",
    supabaseUrl: "http://localhost:54321",
  }), false);
});

Deno.test("hosted runtime configuration requires a Turnstile secret", () => {
  assertEquals(turnstileConfigurationAvailable({
    secret: "configured-secret",
    requirement: "true",
    supabaseUrl: "https://project.supabase.co",
  }), true);
  assertEquals(turnstileConfigurationAvailable({
    secret: undefined,
    requirement: "false",
    supabaseUrl: "https://project.supabase.co",
  }), false);
  assertEquals(turnstileConfigurationAvailable({
    secret: undefined,
    requirement: "false",
    supabaseUrl: "http://localhost:54321",
  }), true);
});
