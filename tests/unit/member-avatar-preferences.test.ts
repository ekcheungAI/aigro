import { describe, expect, it } from "vitest";
import {
  AVATAR_MAX_BYTES,
  HONG_KONG_AVATAR_PRESETS,
  avatarPresetIndex,
  avatarPresetSeed,
  validateAvatarFile,
  versionedAvatarUrl,
} from "@/components/auth/memberAvatarPreferences";

describe("member avatar preferences", () => {
  it("offers a recognisably Hong Kong preset collection", () => {
    expect(HONG_KONG_AVATAR_PRESETS.map((preset) => preset.label)).toEqual([
      "叮叮",
      "港式奶茶",
      "點心籠",
      "天星小輪",
      "獅子山",
      "洋紫荊",
      "蛋撻",
      "香港區旗",
    ]);
  });

  it("creates stable, distinct preset seeds for one member", () => {
    expect(avatarPresetSeed("elvin@example.com", 0)).toBe(
      avatarPresetSeed("ELVIN@example.com", 0)
    );
    expect(avatarPresetSeed("elvin@example.com", 0)).not.toBe(
      avatarPresetSeed("elvin@example.com", 1)
    );
  });

  it("restores the selected Hong Kong avatar from a saved seed", () => {
    const seed = avatarPresetSeed("elvin@example.com", 3);
    expect(avatarPresetIndex(seed, "elvin@example.com")).toBe(3);
  });

  it("assigns members without a saved choice a stable local avatar", () => {
    expect(avatarPresetIndex(undefined, "elvin@example.com")).toBe(
      avatarPresetIndex(undefined, "ELVIN@example.com")
    );
    expect(avatarPresetIndex(undefined, "elvin@example.com")).toBeGreaterThanOrEqual(0);
    expect(avatarPresetIndex(undefined, "elvin@example.com")).toBeLessThan(8);
  });

  it("accepts JPEG, PNG and WebP files up to 2 MB", () => {
    expect(validateAvatarFile({ type: "image/jpeg", size: AVATAR_MAX_BYTES })).toBeNull();
    expect(validateAvatarFile({ type: "image/png", size: 48_000 })).toBeNull();
    expect(validateAvatarFile({ type: "image/webp", size: 48_000 })).toBeNull();
  });

  it("rejects unsupported formats and oversized files", () => {
    expect(validateAvatarFile({ type: "image/gif", size: 48_000 })).toMatch(/JPG、PNG 或 WebP/);
    expect(validateAvatarFile({ type: "image/png", size: AVATAR_MAX_BYTES + 1 })).toMatch(/2 MB/);
  });

  it("adds a cache-busting version without dropping existing query params", () => {
    expect(versionedAvatarUrl("https://cdn.example/avatar?download=1", "2026-08-14T00:00:00Z"))
      .toBe("https://cdn.example/avatar?download=1&v=2026-08-14T00%3A00%3A00Z");
  });
});
