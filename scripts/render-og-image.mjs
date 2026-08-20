import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const logoPath = resolve(
  projectRoot,
  "public/brand/aigro-wordmark-navy-transparent.png"
);
const outputPath = resolve(projectRoot, "public/og-image.png");
const logo = await readFile(logoPath);
const logoDataUrl = `data:image/png;base64,${logo.toString("base64")}`;

const browser = await chromium.launch();

try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });

  await page.setContent(`<!doctype html>
    <html lang="zh-Hant-HK">
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          html, body { width: 1200px; height: 630px; margin: 0; }
          body {
            overflow: hidden;
            background: #f5f7fa;
            color: #02122c;
            font-family: Inter, "Noto Sans TC", "PingFang TC", sans-serif;
          }
          .card {
            position: relative;
            width: 1200px;
            height: 630px;
            padding: 64px 78px 58px;
            border: 1px solid #d8e0e8;
          }
          .rail {
            position: absolute;
            inset: 0 0 0 auto;
            width: 12px;
            background: #02122c;
          }
          .watermark {
            position: absolute;
            right: 70px;
            bottom: -74px;
            width: 670px;
            opacity: 0.045;
          }
          .top {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-right: 42px;
          }
          .logo { width: 168px; height: auto; display: block; }
          .edition {
            display: flex;
            align-items: center;
            gap: 14px;
            color: #526071;
            font-family: "IBM Plex Mono", ui-monospace, monospace;
            font-size: 15px;
            font-weight: 600;
            letter-spacing: 0.16em;
            text-transform: uppercase;
          }
          .edition::before { content: ""; width: 42px; height: 2px; background: #43f50e; }
          .headline {
            position: relative;
            z-index: 1;
            margin-top: 82px;
            max-width: 980px;
            font-family: Fraunces, "Noto Serif TC", "Songti TC", serif;
            font-weight: 600;
            letter-spacing: -0.035em;
            line-height: 1.04;
          }
          .headline .community { color: #1f7a06; font-size: 64px; }
          .headline .promise { margin-top: 14px; font-size: 58px; }
          .footer {
            position: absolute;
            z-index: 1;
            right: 120px;
            bottom: 58px;
            left: 78px;
            display: flex;
            align-items: end;
            justify-content: space-between;
            padding-top: 24px;
            border-top: 1px solid #cbd5df;
            color: #526071;
          }
          .resources { font-size: 21px; font-weight: 500; letter-spacing: 0.01em; }
          .url {
            font-family: "IBM Plex Mono", ui-monospace, monospace;
            font-size: 15px;
            font-weight: 600;
            letter-spacing: 0.08em;
          }
        </style>
      </head>
      <body>
        <main class="card">
          <div class="rail" aria-hidden="true"></div>
          <img class="watermark" src="${logoDataUrl}" alt="" />
          <header class="top">
            <img class="logo" src="${logoDataUrl}" alt="AIGRO" />
            <div class="edition">Hong Kong · AI × Growth</div>
          </header>
          <section class="headline">
            <div class="community">香港 #1 AI Builder 社群</div>
            <div class="promise">最好嘅資源・一齊學習成長</div>
          </section>
          <footer class="footer">
            <div class="resources">每日精選情報 · 領航專家 · 實用 AI 資源</div>
            <div class="url">aigro.io</div>
          </footer>
        </main>
      </body>
    </html>`);

  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: outputPath, type: "png" });
  process.stdout.write(`Rendered ${outputPath}\n`);
} finally {
  await browser.close();
}
