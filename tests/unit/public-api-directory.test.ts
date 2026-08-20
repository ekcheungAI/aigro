import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  buildPublicApiRpcArgs,
  collectAdminPublicApiPages,
  filterFallbackPublicApis,
  isSafeHttpsUrl,
  normalizePublicApiPageRows,
  normalizePublicApiRow,
  validatePublicApiInput,
} from "@/lib/publicApiDirectory";
import type { AdminPublicApiInput } from "@/types/publicApiDirectory";
// @ts-expect-error The production importer is intentionally zero-dependency ESM.
import {
  isPinnedPublicApisRef,
  parsePublicApisMarkdown,
  sourceKeyForPublicApi,
} from "../../scripts/import-public-apis.mjs";

const row = {
  id: "81000000-0000-4000-8000-000000000001",
  name: "Example API",
  description_en: "Useful data 🚀",
  editorial_summary_zh_hk: "適合香港產品原型。",
  category: "Development",
  use_cases: ["原型", "自動化"],
  auth_type: "apiKey",
  https_supported: true,
  cors_status: "yes",
  docs_url: "https://example.com/docs",
  hk_relevance: "medium",
  source_kind: "public-apis",
  source_url: "https://github.com/public-apis/public-apis",
  upstream_ref: "c045a2eb505f0f8b7992bb4af53cc020f25003fd",
  review_state: "aigro_reviewed",
  last_reviewed_at: "2026-08-20",
  updated_at: "2026-08-20T00:00:00.000Z",
  total_count: 7,
};

const validInput: AdminPublicApiInput = {
  name: "Manual API",
  descriptionEn: "Developer data",
  editorialSummaryZhHk: "適合香港團隊建立資料原型。",
  category: "Development",
  useCases: ["原型", "自動化"],
  authType: "No",
  httpsSupported: true,
  corsStatus: "unknown",
  docsUrl: "https://example.com/docs",
  hkRelevance: "medium",
};

describe("public API directory client", () => {
  it("normalizes explicit public columns and strips visible emoji", () => {
    const normalized = normalizePublicApiRow(row);
    expect(normalized).not.toBeNull();
    expect(normalized?.descriptionEn).toBe("Useful data");
    expect(normalized?.corsStatus).toBe("yes");
    expect(normalized?.sourceKind).toBe("public-apis");
  });

  it("rejects unsafe documentation URLs and embedded credentials", () => {
    expect(isSafeHttpsUrl("http://example.com/docs")).toBe(false);
    expect(isSafeHttpsUrl("https://user:pass@example.com/docs")).toBe(false);
    expect(normalizePublicApiRow({ ...row, docs_url: "javascript:alert(1)" })).toBeNull();
  });

  it("builds bounded RPC arguments", () => {
    expect(buildPublicApiRpcArgs({ query: "  weather  ", limit: 999, offset: -4 })).toEqual({
      p_query: "weather",
      p_category: null,
      p_auth_type: null,
      p_cors_status: null,
      p_https: null,
      p_limit: 100,
      p_offset: 0,
    });
  });

  it("extracts total_count without exposing malformed rows", () => {
    const page = normalizePublicApiPageRows([row, { bad: true }]);
    expect(page.entries).toHaveLength(1);
    expect(page.total).toBe(7);
  });

  it("validates and trims an admin-created published entry", () => {
    expect(validatePublicApiInput({ ...validInput, name: "  Manual API  " })).toEqual(validInput);
    expect(() =>
      validatePublicApiInput({ ...validInput, docsUrl: "https://user:secret@example.com" })
    ).toThrow(/HTTPS/);
    expect(() =>
      validatePublicApiInput({ ...validInput, editorialSummaryZhHk: "香港原型 🚀" })
    ).toThrow(/emoji/);
    expect(() =>
      validatePublicApiInput({ ...validInput, editorialSummaryZhHk: "English only" })
    ).toThrow(/中文/);
  });

  it("filters the no-backend launch catalogue deterministically", () => {
    const result = filterFallbackPublicApis({ query: "HKD", authType: "No" });
    expect(result.total).toBe(1);
    expect(result.entries[0]?.name).toBe("Frankfurter");
  });

  it("walks every exact-count admin range beyond PostgREST's 1,000-row cap", async () => {
    const rows = Array.from({ length: 1_205 }, (_, id) => ({ id }));
    const fetchPage = vi.fn(async (from: number, to: number) => ({
      rows: rows.slice(from, to + 1),
      total: rows.length,
    }));

    const result = await collectAdminPublicApiPages(fetchPage, 500);

    expect(result).toHaveLength(1_205);
    expect(result.at(-1)).toEqual({ id: 1_204 });
    expect(fetchPage.mock.calls).toEqual([
      [0, 499],
      [500, 999],
      [1_000, 1_499],
    ]);
  });
});

describe("pinned public-apis importer", () => {
  it("excludes sponsor tables, rejects unsafe/duplicate rows, and creates drafts", () => {
    const fixture = readFileSync(
      resolve(process.cwd(), "tests/fixtures/public-apis-mini.md"),
      "utf8"
    );
    const parsed = parsePublicApisMarkdown(
      fixture,
      "c045a2eb505f0f8b7992bb4af53cc020f25003fd"
    );

    expect(parsed.stats).toEqual({ parsed: 3, categories: 2, rejected: 3, duplicates: 1 });
    expect(parsed.entries.map((entry: { name: string }) => entry.name)).toEqual([
      "Good API",
      "Emoji API",
      "Weather API",
    ]);
    expect(parsed.entries.some((entry: { name: string }) => entry.name === "Sponsor API")).toBe(false);
    expect(parsed.entries.every((entry: { status: string }) => entry.status === "draft")).toBe(true);
    expect(
      parsed.entries.every(
        (entry: { editorial_summary_zh_hk: string }) => entry.editorial_summary_zh_hk === ""
      )
    ).toBe(true);
    expect(parsed.entries[1].description_en).toBe("Fast tools for builders");
    expect(parsed.entries[2].description_en).toBe("Forecasts | alerts");
  });

  it("uses canonical upstream URL identity for idempotent upserts", () => {
    const original = {
      category: "Development",
      name: "Good API",
      docsUrl: "https://API.example.com/docs/?utm_source=catalogue",
    };
    const editoriallyChanged = {
      category: "Data Validation",
      name: "Good API — reviewed",
      docsUrl: "https://api.example.com/docs",
    };
    expect(sourceKeyForPublicApi(original)).toBe(sourceKeyForPublicApi(editoriallyChanged));
    expect(sourceKeyForPublicApi(original)).toMatch(/^public-apis:[a-f0-9]{64}$/);
    expect(() => sourceKeyForPublicApi({ docsUrl: "http://api.example.com/docs" })).toThrow(
      /safe HTTPS/
    );
  });

  it("requires a full pinned Git SHA before an apply run", () => {
    expect(isPinnedPublicApisRef("master")).toBe(false);
    expect(isPinnedPublicApisRef("c045a2eb505f0f8b7992bb4af53cc020f25003fd")).toBe(true);
  });
});
