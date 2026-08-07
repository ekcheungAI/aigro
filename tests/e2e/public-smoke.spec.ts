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
