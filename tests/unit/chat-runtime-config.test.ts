import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("supabase/functions/ask-answer/index.ts", "utf8");

describe("instructor chat runtime configuration", () => {
  it("fails closed on provider and Turnstile configuration before stored-answer replay", () => {
    const modelProviderCheck = source.indexOf('minimaxApiKey: Deno.env.get("MINIMAX_API_KEY")');
    const embeddingProviderCheck = source.indexOf('openaiApiKey: Deno.env.get("OPENAI_API_KEY")');
    const runtimeConfigurationCheck = source.indexOf("chatRuntimeConfigurationError(runtimeEnvironment)");
    const storedReplay = source.indexOf('previous.state === "ready"');

    expect(modelProviderCheck).toBeGreaterThan(-1);
    expect(embeddingProviderCheck).toBeGreaterThan(-1);
    expect(runtimeConfigurationCheck).toBeGreaterThan(-1);
    expect(storedReplay).toBeGreaterThan(-1);
    expect(modelProviderCheck).toBeLessThan(storedReplay);
    expect(embeddingProviderCheck).toBeLessThan(storedReplay);
    expect(runtimeConfigurationCheck).toBeLessThan(storedReplay);
  });
});
