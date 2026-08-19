import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const ssrDir = path.join(rootDir, "dist-ssr");
const templatePath = path.join(distDir, "index.html");
const serverEntryPath = path.join(ssrDir, "entry-server.js");

const routes = [
  { url: "/", renderUrl: "/" },
  { url: "/insights", renderUrl: "/insights" },
  { url: "/insights/daily", renderUrl: "/insights?tab=daily" },
  { url: "/cases", renderUrl: "/cases" },
  { url: "/experts", renderUrl: "/experts" },
  { url: "/guides", renderUrl: "/class-review" },
];

const template = await readFile(templatePath, "utf8");
const {
  DEFAULT_DESC,
  DEFAULT_TITLE,
  formatPageTitle,
  getRouteMeta,
  render,
} = await import(pathToFileURL(serverEntryPath).href);

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function outputPath(url) {
  if (url === "/") return path.join(distDir, "index.html");
  return path.join(distDir, url.slice(1), "index.html");
}

function withHead(html, routeUrl) {
  const meta = getRouteMeta(routeUrl);
  const title = escapeHtml(meta ? formatPageTitle(meta.title) : DEFAULT_TITLE);
  const description = escapeHtml(meta?.description ?? DEFAULT_DESC);
  return html
    .replace(/<title>.*?<\/title>/s, `<title>${title}</title>`)
    .replace(
      /<meta name="description" content="[^"]*" \/>/,
      `<meta name="description" content="${description}" />`
    )
    .replace(
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${title}" />`
    )
    .replace(
      /<meta property="og:description" content="[^"]*" \/>/,
      `<meta property="og:description" content="${description}" />`
    );
}

for (const route of routes) {
  const appHtml = await render(route.renderUrl);
  const html = withHead(template, route.url).replace(
    '<div id="root"></div>',
    `<div id="root" data-prerender-url="${escapeHtml(route.renderUrl)}">${appHtml}</div>`
  );
  const target = outputPath(route.url);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html);
  console.log(`prerendered ${route.url} -> ${path.relative(rootDir, target)}`);
}

await rm(ssrDir, { recursive: true, force: true });
