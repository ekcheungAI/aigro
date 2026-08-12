import { expect, test } from "@playwright/test";

test("public routes load without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/ask?expert=elvin-cheung");
  await expect(page.getByRole("heading", { name: "Ask 問答" })).toBeAttached();
  await expect(page.getByText("AI 分身 · Beta").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("protected CMS routes keep their authentication gates", async ({ page }) => {
  await page.goto("/portal/kb");
  await expect(page.getByRole("heading", { name: "需要領航專家帳號登入" })).toBeVisible();
  await page.goto("/admin/studio");
  await expect(page.getByRole("heading", { name: "需要 admin 帳號登入" })).toBeVisible();
});

test("Class Review is discoverable and the responsive course shell stays consistent", async ({ page }) => {
  await page.setViewportSize({ width: 824, height: 691 });
  await page.goto("/guides/100x-ai-growth-marketer");

  await expect(page.getByText("AIGRO CLASS REVIEW · 課堂重溫")).toBeVisible();
  await expect(
    page.getByText("DotAI × EK (ekcheungAI) · 聯合策劃及教學")
  ).toBeVisible();
  await expect(page.getByRole("heading", {
    level: 1,
    name: "100x AI Growth Marketer 養成課｜Level 1 + Level 2 導讀",
  })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "導讀目錄" })).toBeVisible();
  await expect(page.getByRole("region", {
    name: "100x AI Growth Marketer 四階段學習時間線",
  })).toHaveAttribute("tabindex", "0");
  await expect(page.getByRole("link", { name: "Class Review 課堂重溫" })).toBeAttached();
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");

  await page.getByRole("button", { name: "開啟選單" }).click();
  const dialog = page.getByRole("dialog", { name: "主選單" });
  await expect(dialog).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(dialog.getByRole("link", { name: "Insights 情報" })).toHaveCSS(
    "font-size",
    "32px"
  );
  await expect(page.locator("main")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

  await page.getByRole("button", { name: "關閉選單" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
