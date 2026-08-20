import { expect, test } from "@playwright/test";

test("public API directory is deep-linkable, searchable, and source-transparent", async ({ page }) => {
  const outboundProviderRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      !["127.0.0.1", "localhost", "fonts.googleapis.com", "fonts.gstatic.com"].includes(url.hostname)
    ) {
      outboundProviderRequests.push(request.url());
    }
  });

  await page.goto("/skills?tab=apis");

  await expect(
    page.getByRole("heading", { level: 1, name: "Public APIs 公開 API 目錄" })
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Public APIs 公開 API" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(page.getByText("8 個已發佈 API", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /public-apis 原始目錄/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /MIT 授權/ })).toBeVisible();

  await page.getByRole("searchbox", { name: "搜尋公開 API" }).fill("HKD");
  await expect(page.getByText("1 個已發佈 API", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Frankfurter" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "GitHub" })).toHaveCount(0);

  const officialDocs = page.getByRole("link", { name: /官方文件/ }).first();
  await expect(officialDocs).toHaveAttribute("href", /^https:\/\//);
  await expect(officialDocs).toHaveAttribute("rel", /noopener/);
  expect(outboundProviderRequests).toEqual([]);
});

test("directory tabs preserve browser history and expose structured filters", async ({ page }) => {
  await page.goto("/skills");
  await page.getByRole("tab", { name: "Public APIs 公開 API" }).click();
  await expect(page).toHaveURL(/\/skills\?tab=apis$/);
  await expect(page.getByLabel("API 認證方式")).toBeVisible();
  await expect(page.getByLabel("API CORS 狀態")).toBeVisible();

  await page.getByLabel("API 認證方式").selectOption("OAuth");
  await expect(page.getByText("2 個已發佈 API", { exact: true })).toBeVisible();
  await page.getByLabel("API CORS 狀態").selectOption("yes");
  await expect(page.getByText("1 個已發佈 API", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "GitHub" })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "Skills 技能庫" })).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole("heading", { level: 1, name: "Public APIs 公開 API 目錄" })
  ).toBeVisible();
});

test("API directory stays inside a mobile viewport in both themes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/skills?tab=apis");

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
