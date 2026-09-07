import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const requireFromWeb = createRequire(resolve("apps/web/package.json"));
const { chromium } = requireFromWeb("@playwright/test");

const english = process.argv.includes("--en");
const sourcePath = resolve(`docs/assets/og/backlog-og${english ? "-en" : ""}.html`);
const outputPath = resolve(`apps/web/public/brand/backlog-og${english ? "-en" : ""}.png`);

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(pathToFileURL(sourcePath).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#backlog-og").screenshot({
    path: outputPath,
    animations: "disabled",
  });
  console.log(`Open Graph image rendered at ${outputPath}`);
} finally {
  await browser.close();
}
