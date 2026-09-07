import type { Task } from "@backlog-syntax/contracts";
import { expect, type Page, test } from "@playwright/test";

const origin = (process.env.PUBLIC_WEB_URL ?? "http://localhost:3000").replace(/\/$/, "");
const publicPages = [
  ["/", "/en", "Open-source task management"],
  ["/documentacao", "/en/docs", "Documentation"],
  ["/privacidade", "/en/privacy", "Privacy"],
  ["/cookies", "/en/cookies", "Cookies"],
  ["/termos", "/en/terms", "Terms of use"],
  ["/transparencia", "/en/transparency", "Transparency"],
] as const;

test.describe("English HTML without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("English public content, canonicals and reciprocal languages work without JavaScript", async ({
    page,
  }) => {
    for (const [pt, en, heading] of publicPages) {
      await page.goto(`${origin}${en}`);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${origin}${en}`);
      await expect(page.locator('link[hreflang="pt-BR"]')).toHaveAttribute(
        "href",
        pt === "/" ? origin : `${origin}${pt}`,
      );
      await expect(page.locator('link[hreflang="en"]')).toHaveAttribute("href", `${origin}${en}`);
      await expect(page.getByRole("link", { name: "English", exact: true })).toBeVisible();
      expect(await page.title()).not.toMatch(/Documentação|Privacidade|Transparência/);
    }
  });
});

test("Markdown negotiation covers only public pages and separates representations", async ({
  request,
}) => {
  for (const [pt, en, heading] of publicPages) {
    const markdown = await request.get(en, {
      headers: { Accept: "text/markdown", "User-Agent": "OAI-SearchBot" },
    });
    expect(markdown.status(), `${en}: ${await markdown.text()}`).toBe(200);
    expect(markdown.headers()["content-type"]).toContain("text/markdown");
    expect(markdown.headers()["content-language"]).toBe("en");
    expect(
      markdown
        .headers()
        .vary?.toLowerCase()
        .split(",")
        .map((token) => token.trim()),
    ).toContain("accept");
    expect(markdown.headers()["content-signal"]).toBe("search=yes, ai-input=yes, ai-train=no");
    expect(markdown.headers().link).toContain(`${origin}${en}`);
    const body = await markdown.text();
    expect(body).toContain(heading);
    expect(body).not.toMatch(/<script|self\.__next_f|__NEXT_DATA__/);
    const portuguese = await request.get(pt, { headers: { Accept: "text/markdown" } });
    expect(portuguese.status()).toBe(200);
    expect(portuguese.headers()["content-language"]).toBe("pt-BR");
    for (const path of [pt, en]) {
      const html = await request.get(path, { headers: { Accept: "text/markdown;q=0, text/html" } });
      expect(html.headers()["content-type"]).toContain("text/html");
      const vary = html
        .headers()
        .vary?.toLowerCase()
        .split(",")
        .map((token) => token.trim());
      expect(vary).toContain("accept");
      expect(vary).toContain("rsc");
    }
  }
  for (const path of ["/w/acme", "/en/w/acme/settings/privacy", "/en/sign-in", "/en/consent"]) {
    const response = await request.get(path, { headers: { Accept: "text/markdown" } });
    expect(response.headers()["content-type"]).not.toContain("text/markdown");
  }
  for (const path of [
    "/api/public-markdown/en/w",
    "/api/public-markdown/fr/home",
    "/api/public-markdown/en/https%3A%2F%2Fexample.com",
    "/api/public-markdown/en/entrar",
  ]) {
    expect((await request.get(path)).status()).toBe(404);
  }
  const direct = await request.get(
    "/api/public-markdown/en/home?url=https://example.com&path=/w/acme",
    {
      headers: { Cookie: "fixture=private-value", Authorization: "Bearer fixture-token" },
    },
  );
  expect(direct.status()).toBe(200);
  expect(await direct.text()).toContain("Open-source task management");
  expect(await direct.text()).not.toMatch(/fixture-token|private-value/);
  const rsc = await request.get("/en", { headers: { Accept: "text/markdown", RSC: "1" } });
  expect(rsc.headers()["content-type"]).not.toContain("text/markdown");
  const head = await request.head("/en", { headers: { Accept: "text/markdown" } });
  expect(head.status()).toBe(200);
  expect(head.headers()["content-type"]).toContain("text/markdown");
  expect(await head.body()).toHaveLength(0);
});

test("sitemap and crawler policy expose both languages while excluding private paths", async ({
  request,
}) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap.match(/<loc>/g)).toHaveLength(12);
  expect(sitemap).toContain(`${origin}/en/docs`);
  expect(sitemap).toContain('hreflang="en"');
  expect(sitemap).not.toMatch(/sign-in|\/w\/|onboarding/);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Content-Signal: search=yes, ai-input=yes, ai-train=no");
  expect(robots).toContain("Disallow: /en/w");
  expect(robots).toContain("Disallow: /en/sign-in");
  expect(robots).not.toContain("Disallow: /en/docs");
  const discovery = await request.get("/llms.txt");
  expect(discovery.status()).toBe(200);
  expect(await discovery.text()).toContain("/en/docs");
});

test("language switching preserves reset and OAuth parameters and app links retain English", async ({
  page,
}) => {
  await page.goto("/en/reset-password?token=fixture%2Btoken&next=%2Fw%2Facme#form");
  await page.getByRole("link", { name: "Português do Brasil" }).click();
  await expect(page).toHaveURL(
    /\/recuperar-senha\/redefinir\?token=fixture%2Btoken&next=%2Fw%2Facme#form$/,
  );
  await page.getByRole("link", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(
    /\/en\/reset-password\?token=fixture%2Btoken&next=%2Fw%2Facme#form$/,
  );
  await page.goto("/en/consent?client_id=fixture&scope=read%20write");
  await page.getByRole("link", { name: "Português do Brasil" }).click();
  await expect(page).toHaveURL(/\/consent\?client_id=fixture&scope=read%20write$/);
  await page.goto("/en");
  await page.getByRole("link", { name: "Sign in / Create account" }).click();
  await expect(page).toHaveURL(/\/en\/sign-in$/);
  await page.getByRole("link", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/sign-up$/);
  await expect(page.getByLabel("Name", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText("Enter your name.")).toBeVisible();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
});

const workspaceId = "019641a8-8c54-7f6c-8d2f-3fd1eb8b7531";
const projectId = "019641a8-8c54-7f6c-8d2f-3fd1eb8b7532";
const task: Task = {
  id: "019641a8-8c54-7f6c-8d2f-3fd1eb8b7533",
  workspaceId,
  projectId,
  title: "Descrição do projeto fictício",
  description: "Conteúdo escrito pelo usuário.",
  status: "open",
  priority: "medium",
  version: 1,
  position: "1024",
  blockedReason: null,
  scheduledDate: null,
  dueDate: null,
  claimedBy: null,
  archivedAt: null,
  createdAt: "2026-09-01T12:00:00Z",
  updatedAt: "2026-09-01T12:00:00Z",
};

async function signedInFixture(page: Page) {
  let tasks = [task];
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({
      json: {
        session: {
          id: "session-fixture",
          userId: "user-fixture",
          expiresAt: "2030-01-01T00:00:00Z",
        },
        user: {
          id: "user-fixture",
          name: "Pessoa fictícia",
          email: "reader@example.com",
          emailVerified: true,
          termsAcceptedAt: "2026-09-05",
          privacyNoticeAcceptedAt: "2026-09-05",
          legalNoticeVersion: "2026-09-05",
        },
      },
    }),
  );
  await page.route("**/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/v1/workspaces")
      return route.fulfill({
        json: {
          data: [{ id: workspaceId, slug: "acme", name: "Projeto fictício", role: "owner" }],
          page: { hasMore: false, nextCursor: null },
        },
      });
    if (path.endsWith("/context"))
      return route.fulfill({
        json: {
          workspace: { id: workspaceId, slug: "acme", name: "Projeto fictício" },
          principal: { subjectType: "user", subjectId: "user-fixture", role: "owner" },
          projects: [
            {
              id: projectId,
              slug: "demo",
              name: "Projeto em português",
              updatedAt: "2026-09-01T12:00:00Z",
            },
          ],
        },
      });
    if (path.endsWith("/events") || path.endsWith("/service-accounts"))
      return route.fulfill({ json: [] });
    if (path.endsWith("/tasks") && route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      const created = { ...task, ...body, id: "019641a8-8c54-7f6c-8d2f-3fd1eb8b7534" };
      tasks = [...tasks, created];
      return route.fulfill({ status: 201, json: created });
    }
    if (path.endsWith("/tasks"))
      return route.fulfill({ json: { data: tasks, page: { hasMore: false, nextCursor: null } } });
    return route.fulfill({ status: 404, json: { code: "not_found" } });
  });
}

test("English users can use the board, create tasks and navigate all settings without translating their data", async ({
  page,
}) => {
  await signedInFixture(page);
  await page.goto("/en/w/acme");
  for (const status of ["Open", "In progress", "Blocked", "Done"])
    await expect(page.getByRole("heading", { name: status, exact: true })).toBeVisible();
  await expect(page.getByText(task.title, { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("EN test with descrição preserved");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(
    page.getByText("EN test with descrição preserved", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: `Task details: ${task.title}` }).click();
  await expect(page.getByText(task.description as string, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Priority" })).toHaveValue("medium");
  for (const [path, heading] of [
    ["settings/profile", "Profile"],
    ["settings/members", "Members"],
    ["settings/workspace", "Workspace"],
    ["settings/agents", "Agents and tokens"],
    ["settings/mcp", "MCP connection"],
    ["settings/privacy", "Privacy and LGPD"],
    ["docs", "Documentation"],
  ]) {
    await page.goto(`/en/w/acme/${path}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading ?? "");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator("link[hreflang]")).toHaveCount(0);
  }
  await page.goto("/en/w/acme/tasks");
  await expect(page.getByRole("heading", { name: "To schedule" })).toBeVisible();
  await expect(page.getByText(task.title, { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "Português do Brasil" }).click();
  await expect(page).toHaveURL(/\/w\/acme\/tasks$/);
  await expect(page.getByRole("heading", { name: "Para agendar" })).toBeVisible();
});

for (const width of [320, 390, 820, 1440]) {
  test(`English pages remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await signedInFixture(page);
    for (const path of [
      "/en",
      "/en/docs",
      "/en/w/acme",
      "/en/w/acme/tasks",
      "/en/w/acme/settings/privacy",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("link", { name: "English", exact: true })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);
    }
  });
}
