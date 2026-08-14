import { expect, test } from "@playwright/test";

test("public routes load without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/ask?expert=elvin-cheung");
  await expect(page.getByRole("heading", { name: "AI 問答功能準備中" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("protected CMS routes keep their authentication gates", async ({ page }) => {
  await page.goto("/portal/kb");
  await expect(page.getByRole("heading", { name: "需要領航專家帳號登入" })).toBeVisible();
  await page.goto("/admin/studio");
  await expect(page.getByRole("heading", { name: "需要 admin 帳號登入" })).toBeVisible();
});

test("Ask and Experts are publicly blocked while Pricing stays hidden", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "主導航" }).getByRole("link", { name: /Experts 專家 Coming Soon/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "主導航" }).getByRole("link", { name: /Ask 問答 Coming Soon/i })).toBeVisible();

  await page.goto("/ask");
  await expect(page.getByRole("heading", { name: "AI 問答功能準備中" })).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();

  await page.goto("/experts");
  await expect(page.getByRole("heading", { name: "領航專家平台即將開放" })).toBeVisible();

  await page.goto("/experts/elvin-cheung");
  await expect(page.getByRole("heading", { name: "領航專家平台即將開放" })).toBeVisible();

  await page.goto("/pricing");
  await expect(page).toHaveURL(/\?auth=join&next=%2F$/);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "免費建立創始會員帳號" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Pricing/ })).toHaveCount(0);
});

test("Coming Soon labels use the branded status treatment in every navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const desktopTags = page
    .getByRole("navigation", { name: "主導航" })
    .locator('[data-ui="coming-soon-tag"]');
  await expect(desktopTags).toHaveCount(2);
  await expect(desktopTags.first()).toHaveAttribute("data-layout", "desktop-flag");
  await expect(desktopTags.first().locator('[data-ui="coming-soon-edge"]')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "開啟選單" }).click();
  const mobileTags = page
    .getByRole("navigation", { name: "手機導航" })
    .locator('[data-ui="coming-soon-tag"]');
  await expect(mobileTags).toHaveCount(2);
  await expect(mobileTags.first()).toHaveAttribute("data-layout", "mobile-label");
  await expect(mobileTags.first().locator('[data-ui="coming-soon-hairline"]')).toBeVisible();
});

test("compact desktop navigation keeps Coming Soon flags on one line", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");

  const desktopNav = page.getByRole("navigation", { name: "主導航" });
  const secondaryLabels = desktopNav.locator('[data-ui="nav-secondary-label"]');
  await expect(secondaryLabels).toHaveCount(4);
  await expect(secondaryLabels.first()).toBeHidden();
  await expect(desktopNav.locator('[data-layout="desktop-flag"]')).toHaveCount(2);
});

test("desktop navigation labels and account actions never wrap", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const banner = page.getByRole("banner");
  const desktopLinks = banner.getByRole("navigation", { name: "主導航" }).getByRole("link");
  await expect(desktopLinks).toHaveCount(4);
  for (let index = 0; index < await desktopLinks.count(); index += 1) {
    await expect(desktopLinks.nth(index)).toHaveCSS("white-space", "nowrap");
  }
  await expect(banner.getByRole("link", { name: "登入" })).toHaveCSS("white-space", "nowrap");
  await expect(banner.getByRole("link", { name: "加入 Club" })).toHaveCSS("white-space", "nowrap");
});

test("homepage hero has no full-height decorative vertical rule", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const hero = page
    .getByRole("heading", { level: 1, name: /香港 AI 增長網絡/ })
    .locator("xpath=ancestor::section[1]");
  expect(
    await hero.evaluate((section) => {
      const sectionHeight = section.getBoundingClientRect().height;
      return [...section.querySelectorAll<HTMLElement>("span")].some((element) => {
        const rect = element.getBoundingClientRect();
        return (
          getComputedStyle(element).position === "absolute" &&
          rect.width <= 1.5 &&
          rect.height >= sectionHeight * 0.9
        );
      });
    })
  ).toBe(false);
});

test("Coming Soon pages use a membership conversion prompt", async ({ page }) => {
  await page.goto("/ask");

  const panel = page.locator('[data-ui="feature-access-panel"]');
  await expect(panel).toBeVisible();
  await expect(panel.getByText("免費會員優先開放", { exact: true })).toBeVisible();
  await expect(panel.getByRole("link", { name: "免費加入 AIGRO" })).toHaveAttribute(
    "href",
    "/ask?auth=join&next=%2Fask"
  );
  await expect(panel.getByRole("link", { name: "已有帳號？登入" })).toHaveAttribute(
    "href",
    "/ask?auth=login&next=%2Fask"
  );

  await panel.getByRole("link", { name: "免費加入 AIGRO" }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "免費建立創始會員帳號" })).toBeVisible();
});

test("signup onboarding is free and skips package selection", async ({ page }) => {
  await page.goto("/join?plan=vip");

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "免費建立創始會員帳號" })).toBeVisible();
  await expect(dialog.getByText("使用 Google 或 Email 免費加入，立即取得創始會員身份。", { exact: true })).toBeVisible();
  await expect(page.getByText("揀方案", { exact: true })).toHaveCount(0);
  await expect(page.getByText("創始會員", { exact: true })).toHaveCount(0);
  await expect(page.getByText("VIP", { exact: true })).toHaveCount(0);

  await expect(dialog.getByRole("button", { name: "使用 Google 註冊" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "免費加入並成為創始會員" })).toBeVisible();
});

test("other industries are labelled coming soon and cannot expand", async ({ page }) => {
  await page.goto("/insights");
  await expect(page.getByLabel("其他行業 Coming Soon")).toBeVisible();
  await expect(page.getByRole("button", { name: /行業路線圖/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /其他行業/ })).toHaveCount(0);
  await expect(page.getByText("Beauty 美妝", { exact: true })).toHaveCount(0);
});

test("homepage insight cards do not create a nested scroll area", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const insightsSection = page
    .getByRole("heading", { name: "情報 Insights" })
    .locator("xpath=ancestor::section[1]");

  await expect(insightsSection).toBeVisible();
  expect(
    await insightsSection.evaluate((section) =>
      [...section.querySelectorAll<HTMLElement>("*")].some((element) => {
        const overflowX = getComputedStyle(element).overflowX;
        return (
          (overflowX === "auto" || overflowX === "scroll") &&
          element.scrollWidth > element.clientWidth
        );
      })
    )
  ).toBe(false);
});

test("homepage chat preview uses the AIGRO assistant name", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("AIGRO 助手", { exact: true })).toBeVisible();
  await expect(page.getByText("AIGRO 編輯部", { exact: true })).toHaveCount(0);
});

test("homepage hero presents the scale of the AIGRO network", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: /香港 AI 增長網絡/ })
  ).toBeVisible();
  await expect(
    page.locator("dt").filter({ hasText: "2 位領航專家已上線" })
  ).toBeVisible();
  await expect(page.getByText("8 位蒸餾中", { exact: true })).toBeVisible();
  await expect(
    page.locator("dt").filter({ hasText: "1 個 AI MCP 已就緒" })
  ).toBeVisible();
  await expect(page.getByText("更多行業 MCP 籌備中", { exact: true })).toBeVisible();
});

test("homepage hero watermark uses the exact AIGRO wordmark asset", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.locator(
      'main section img[aria-hidden="true"][src="/brand/aigro-wordmark-navy-transparent.png"]'
    )
  ).toBeVisible();
});

test("homepage hero keeps the intelligence preview inside the first desktop viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(
    page.getByRole("button", { name: /最新 AI 快照|今日 AI 精選速覽/ })
  ).toBeInViewport({ ratio: 0.9 });
});

test("Class Review blocks signed-out visitors and preserves the return path", async ({ page }) => {
  await page.goto("/guides/100x-ai-growth-marketer");

  await expect(page.getByRole("heading", { name: "登入會員，解鎖直播重溫" })).toBeVisible();
  await expect(page.getByRole("link", { name: "免費註冊睇重溫" })).toHaveAttribute(
    "href",
    "/guides/100x-ai-growth-marketer?auth=join&next=%2Fguides%2F100x-ai-growth-marketer"
  );
  await expect(page.getByRole("link", { name: "已有帳號？登入" })).toHaveAttribute(
    "href",
    "/guides/100x-ai-growth-marketer?auth=login&next=%2Fguides%2F100x-ai-growth-marketer"
  );
  await expect(page.getByRole("link", { name: /Follow @aigro.hk/ })).toHaveAttribute(
    "href",
    "https://www.instagram.com/aigro.hk/"
  );
  await expect(page.getByRole("navigation", { name: "導讀目錄" })).toHaveCount(0);

  await page.getByRole("link", { name: "免費註冊睇重溫" }).click();
  await expect(page).toHaveURL(/\/guides\/100x-ai-growth-marketer\?auth=join/);
  const authDialog = page.getByRole("dialog");
  await expect(authDialog.getByRole("heading", { name: "免費建立創始會員帳號" })).toBeVisible();
  await authDialog.getByRole("tab", { name: "登入" }).click();
  await expect(authDialog.getByRole("heading", { name: "登入 AIGRO" })).toBeVisible();
  await expect(page).toHaveURL(/\/guides\/100x-ai-growth-marketer\?auth=login/);
});

test("Class Review unlocks the responsive course shell for members", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "aigro-member",
      JSON.stringify({
        name: "Test Member",
        email: "member@example.com",
        interests: [],
        persona: null,
        role: "free",
        tier: "free",
        joinedAt: Date.now(),
        notifications: { daily: true, weekly: true, product: false },
        demo: true,
      })
    );
  });
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
  await expect(
    page.getByRole("button", { name: "YouTube 直播重溫影片 Coming Soon" })
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "直播重溫筆記 Coming Soon" })
  ).toBeDisabled();
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
    "16px"
  );
  await expect(page.locator("main")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

  await page.getByRole("button", { name: "關閉選單" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
