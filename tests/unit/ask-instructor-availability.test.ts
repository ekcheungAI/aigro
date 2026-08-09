import { describe, expect, it } from "vitest";
import {
  getRuntimePersona,
  personas,
  type RuntimePersonaDirectoryState,
} from "@/data/personas";

const platformOnly = personas.filter((persona) => persona.key === "platform");

function resolveRequestedInstructor(
  status: RuntimePersonaDirectoryState["status"]
) {
  return getRuntimePersona("new-instructor", platformOnly, { status });
}

describe("Ask dynamic instructor availability", () => {
  it.each([
    ["loading", "正在載入"],
    ["error", "未能載入"],
    ["ready", "不存在或尚未公開"],
  ] as const)(
    "never falls back to the platform persona while the directory is %s",
    (status, explanation) => {
      const persona = resolveRequestedInstructor(status);

      expect(persona.key).toBe("new-instructor");
      expect(persona.kind).toBe("expert");
      expect(persona.chatReady).toBe(false);
      expect(persona.directoryStatus).toBe(
        status === "ready" ? "missing" : status
      );
      expect(persona.greetingBody).toContain(explanation);
      expect(persona.name).not.toContain("AIGRO 編輯部");
    }
  );

  it("keeps the platform persona for /ask without an expert slug", () => {
    const persona = getRuntimePersona(null, platformOnly, { status: "loading" });
    expect(persona.key).toBe("platform");
    expect(persona.directoryStatus).toBeUndefined();
  });
});
