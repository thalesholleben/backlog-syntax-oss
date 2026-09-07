import { expect, test } from "@playwright/test";

const publicWebUrl = (
  process.env.PUBLIC_WEB_URL?.trim() || "https://backlog.syntaxlab.com.br"
).replace(/\/$/, "");
const publicApiUrl = (process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:8787").replace(
  /\/$/,
  "",
);

test("landing page renders an answer-first hero and the agent-native/FAQ sections", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("#como-funciona")).toBeVisible();
  await expect(page.locator("#perguntas")).toBeVisible();
  await expect(page).toHaveTitle(/Backlog Syntax/);
  expect((await page.title()).match(/Backlog Syntax/g)).toHaveLength(1);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", publicWebUrl);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    `${publicWebUrl}/brand/backlog-og.png`,
  );
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
    "content",
    /o contexto fica/i,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    `${publicWebUrl}/brand/backlog-og.png`,
  );
});

test("header links to entrar and cadastro", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

for (const width of [320, 390, 820, 1024, 1280, 1440, 1920]) {
  test(`hero cover keeps the artwork, copy and font scale at ${width}px`, async ({
    browser,
    baseURL,
  }) => {
    if (!baseURL) throw new Error("A local baseURL is required");
    const context = await browser.newContext({
      baseURL,
      viewport: { width, height: 1000 },
      deviceScaleFactor: width <= 820 ? 2 : 1,
    });
    try {
      const page = await context.newPage();
      const artworkRequests = new Set<string>();
      const pageErrors: string[] = [];
      page.on("request", (request) => {
        if (request.url().includes("/img/hero-cover-")) artworkRequests.add(request.url());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      const hero = page.locator(".bl-home-hero");
      const photo = hero.locator("img");
      await expect(photo).toBeVisible();
      await expect
        .poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth))
        .toBeGreaterThan(0);
      const source = await photo.evaluate((image: HTMLImageElement) => image.currentSrc);
      expect(source).toContain(width < 1024 ? "hero-cover-mobile-" : "hero-cover-desktop-");
      if (width < 1024) expect(source).toMatch(/\.webp$/);
      else expect(source).toContain("/img/hero-cover-desktop-preview.jpg");
      expect(artworkRequests.size).toBe(1);
      await expect(hero.getByRole("link", { name: "Criar conta grátis" })).toHaveAttribute(
        "href",
        "/cadastro",
      );
      await expect(page.locator("body")).not.toContainText(
        /vai ser gratuita quando entrar no ar|ainda está em construção|antes de o produto estar pronto/i,
      );

      for (const colorScheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        const layout = await hero.evaluate((section) => {
          const title = section.querySelector("h1");
          const image = section.querySelector("img");
          if (!title || !image) throw new Error("Missing hero content");
          return {
            section: section.getBoundingClientRect().toJSON(),
            title: title.getBoundingClientRect().toJSON(),
            image: image.getBoundingClientRect().toJSON(),
            fontSize: Number.parseFloat(getComputedStyle(title).fontSize),
            rootSize: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
            foreground: getComputedStyle(title).color,
            leadColor: getComputedStyle(section.querySelector("p.text-foreground") ?? title).color,
            supportingColor: getComputedStyle(section.querySelector("p.text-muted") ?? title).color,
            secondaryBackground: getComputedStyle(
              section.querySelector('a[href="/entrar"]') ?? title,
            ).backgroundColor,
            fit: getComputedStyle(image).objectFit,
            position: getComputedStyle(image).objectPosition,
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
          };
        });
        expect(layout.section.x).toBe(0);
        expect(layout.section.width).toBe(width);
        expect(layout.image.width).toBe(width);
        expect(layout.overflow).toBe(false);
        const previousSize = Math.min(
          4.4 * layout.rootSize,
          Math.max(2.5 * layout.rootSize, width * 0.064),
        );
        expect(layout.fontSize).toBeCloseTo(previousSize * 0.85, 1);
        expect(layout.foreground).toBe("rgb(243, 243, 240)");
        expect(layout.leadColor).toBe("rgb(243, 243, 240)");
        expect(layout.supportingColor).toBe("rgb(194, 196, 187)");
        expect(layout.secondaryBackground).toBe("rgba(255, 255, 255, 0.06)");
        expect(layout.fit).toBe("cover");
        expect(layout.position).toBe("50% 0%");
        if (width < 1024) expect(layout.title.y).toBeGreaterThanOrEqual(layout.image.bottom);
        else {
          expect(layout.title.right).toBeLessThanOrEqual(width / 2 + 1);
          expect(layout.image.height).toBeCloseTo(layout.section.height, 0);
        }
        await page.screenshot({
          path: `../../.test-artifacts/hero-cover-${width}-${colorScheme}.png`,
        });
      }
      expect(pageErrors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

test("hero artwork and copy remain usable without JavaScript", async ({ browser, baseURL }) => {
  if (!baseURL) throw new Error("A local baseURL is required");
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: 390, height: 1000 },
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator(".bl-home-hero img")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.locator(".bl-home-hero").getByRole("link", { name: "Criar conta grátis" }),
    ).toHaveAttribute("href", "/cadastro");
  } finally {
    await context.close();
  }
});

test("legal pages are reachable and render a single H1", async ({ page }) => {
  for (const path of ["/privacidade", "/cookies", "/termos", "/transparencia"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`${path}$`),
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      new RegExp(`${path}$`),
    );
    await expect(page.locator('meta[name="twitter:description"]')).toHaveCount(1);
  }
});

test("public documentation explains API, MCP and WebMCP with indexable metadata", async ({
  page,
}) => {
  await page.goto("/documentacao");
  await expect(page.getByRole("heading", { level: 1, name: "Documentação." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "API REST" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "MCP", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "WebMCP" })).toBeVisible();
  await expect(page.locator('[data-documentation-layout="boxed"]')).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/documentacao$/);
  await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute("content", /noindex/);
  await expect(page.locator("main")).toContainText(`${publicApiUrl}/v1/workspaces/WORKSPACE_ID`);
  expect(await page.locator("main").innerText()).not.toContain("api.backlog.thalesgomes.dev");
});

test("auth pages keep noindex and use their own canonical URL", async ({ page }) => {
  for (const path of ["/entrar", "/cadastro"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${publicWebUrl}${path}`,
    );
  }
});

test("robots.txt disallows private routes and points to the sitemap", async ({ request }) => {
  const response = await request.get("/robots.txt");
  const body = await response.text();
  expect(body).toContain("Disallow: /entrar");
  expect(body).toContain("Disallow: /w");
  expect(body).toContain("Sitemap:");
});

test("sitemap.xml only lists public marketing routes", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  const body = await response.text();
  expect(body).toContain("/documentacao");
  expect(body).toContain("/privacidade");
  expect(body).not.toContain("/entrar");
});

test("llms.txt points language models to the real public documentation", async ({ request }) => {
  const response = await request.get("/llms.txt");
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("/documentacao");
});

test("Open Graph artwork is public and kept below one megabyte", async ({ request }) => {
  const response = await request.get("/brand/backlog-og.png");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
  expect((await response.body()).byteLength).toBeLessThan(1_000_000);
});
