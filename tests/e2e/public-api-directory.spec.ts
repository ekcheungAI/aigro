import { expect, test } from "@playwright/test";
import { AIGRO_PRODUCTION_SUPABASE_URL } from "../../src/lib/deploymentEnvironment";

test("public API directory is deep-linkable, searchable, and source-transparent", async ({ page }) => {
  const outboundProviderRequests: string[] = [];
  const firstPartyHostnames = new Set([
    "127.0.0.1",
    "localhost",
    "fonts.googleapis.com",
    "fonts.gstatic.com",
    new URL(AIGRO_PRODUCTION_SUPABASE_URL).hostname,
  ]);
  const remoteBaseUrl = process.env.AIGRO_E2E_BASE_URL?.trim();
  if (remoteBaseUrl) firstPartyHostnames.add(new URL(remoteBaseUrl).hostname);

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!firstPartyHostnames.has(url.hostname)) {
      outboundProviderRequests.push(request.url());
    }
  });

  await page.goto("/apis");

  await expect(
    page.getByRole("heading", { level: 1, name: "Public APIs 公開 API 目錄" })
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "主導航" }).getByRole("link", { name: "APIs 目錄" })
  ).toHaveAttribute(
    "aria-current",
    "page"
  );
  const publishedCountLabel = page.locator("#public-api-results-title");
  await expect(publishedCountLabel).toHaveText(/^\d+ 個已發佈 API$/);
  const publishedCount = Number(
    (await publishedCountLabel.textContent())?.match(/^\d+/)?.[0] ?? 0
  );
  expect(publishedCount).toBeGreaterThanOrEqual(60);
  await expect(page.getByRole("link", { name: /public-apis 原始目錄/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /MIT 授權/ })).toBeVisible();

  await page.getByRole("searchbox", { name: "搜尋公開 API" }).fill("Frankfurter");
  await expect(page.getByText("1 個已發佈 API", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Frankfurter" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "GitHub" })).toHaveCount(0);

  const officialDocs = page.getByRole("link", { name: /官方文件/ }).first();
  await expect(officialDocs).toHaveAttribute("href", /^https:\/\//);
  await expect(officialDocs).toHaveAttribute("rel", /noopener/);
  expect(outboundProviderRequests).toEqual([]);
});

test("API directory has a standalone route, preserves legacy links, and exposes filters", async ({ page }) => {
  await page.goto("/skills?tab=apis");
  await expect(page).toHaveURL(/\/apis$/);
  await expect(page.getByLabel("API 認證方式")).toBeVisible();
  await expect(page.getByLabel("API CORS 狀態")).toBeVisible();

  await page.getByLabel("API 認證方式").selectOption("OAuth");
  await expect(page.getByText("15 個已發佈 API", { exact: true })).toBeVisible();
  await page.getByLabel("API CORS 狀態").selectOption("yes");
  await expect(page.getByText("1 個已發佈 API", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "GitHub" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "主導航" })
    .getByRole("link", { name: "Skills 技能" })
    .click();
  await expect(page).toHaveURL(/\/skills$/);
  await expect(page.getByRole("heading", { level: 1, name: "Skills 技能庫" })).toBeVisible();

  await page.goBack();
  await expect(
    page.getByRole("heading", { level: 1, name: "Public APIs 公開 API 目錄" })
  ).toBeVisible();
});

test("API directory stays inside a mobile viewport in both themes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/apis");

  const directory = page.locator('[data-ui="public-api-directory"]');
  await expect(directory).toBeVisible();
  expect(
    await directory.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)
  ).toBe(true);

  const themeToggle = page.getByRole("button", { name: "切換至深色模式" }).last();
  await themeToggle.click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(
    await directory.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)
  ).toBe(true);
});
