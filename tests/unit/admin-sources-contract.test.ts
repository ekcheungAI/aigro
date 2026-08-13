import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SOURCE_CATALOGUE_NOTICE,
  SOURCE_CREATE_RESULT,
} from "@/pages/admin/AdminSources";

describe("admin source catalogue contract", () => {
  it("does not present catalogue changes as Argro ingestion controls", () => {
    expect(SOURCE_CATALOGUE_NOTICE).toContain("只會更新 Supabase 目錄");
    expect(SOURCE_CATALOGUE_NOTICE).toContain("唔會改動 Argro runtime");
    expect(SOURCE_CREATE_RESULT).toContain("尚未接入 Argro 抓取管道");

    const visibleContract = `${SOURCE_CATALOGUE_NOTICE} ${SOURCE_CREATE_RESULT}`;
    expect(visibleContract).not.toMatch(/下一輪 sync|開始抓取/);
  });

  it("keeps every visible source action catalogue-scoped", () => {
    const source = readFileSync(
      "src/pages/admin/AdminSources.tsx",
      "utf8"
    );

    expect(source).not.toMatch(/下一輪 sync|開始抓取/);
    expect(source).toContain("暫停目錄");
    expect(source).toContain("啟用目錄");
    expect(source).toContain("Argro 抓取設定未變");
    expect(source).toContain("Checking · 連線中");
    expect(source).toContain("Offline · 30s 重試");
    expect(source).toContain("Stale · 等待重試");
    expect(source).toContain("Live · 30s 更新");
  });
});
