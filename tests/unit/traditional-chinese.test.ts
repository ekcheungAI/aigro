import { describe, expect, it } from "vitest";

import { toTraditionalChinese } from "../../scripts/lib/traditional-chinese.mjs";

describe("Traditional Chinese normalization", () => {
  it("uses full Traditional glyphs while retaining Hong Kong technology wording", () => {
    expect(
      toTraditionalChinese("用户账户重启软件网络数据，默认开启。"),
    ).toBe("用戶賬戶重啟軟件網絡數據，默認開啟。");
  });

  it("strips emoji and trailing whitespace from public copy", () => {
    expect(toTraditionalChinese("  AI 新聞發布 🚀  ")).toBe("AI 新聞發布");
  });
});
