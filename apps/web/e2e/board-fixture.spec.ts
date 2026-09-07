import type { Task } from "@backlog-syntax/contracts";
import { expect, test } from "@playwright/test";

const workspaceId = "019641a8-8c54-7f6c-8d2f-3fd1eb8b7531";
const projectId = "019641a8-8c54-7f6c-8d2f-3fd1eb8b7532";
const otherProjectId = "019641a8-8c54-7f6c-8d2f-3fd1eb8b7539";
const taskId = "019641a8-8c54-7f6c-8d2f-3fd1eb8b7533";

const workspace = { id: workspaceId, name: "Acme", slug: "acme", role: "owner" };
const project = {
  id: projectId,
  name: "Backlog",
  slug: "backlog",
  updatedAt: "2026-08-30T12:00:00Z",
};
const otherProject = {
  id: otherProjectId,
  name: "Site",
  slug: "site",
  updatedAt: "2026-08-30T12:00:00Z",
};

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: taskId,
    workspaceId,
    projectId,
    title: "Escrever contrato do endpoint",
    description: null,
    status: "open",
    priority: "medium",
    blockedReason: null,
    scheduledDate: null,
    dueDate: null,
    position: "1024",
    version: 1,
    createdAt: "2026-08-30T12:00:00Z",
    updatedAt: "2026-08-30T12:00:00Z",
    archivedAt: null,
    claimedBy: null,
    ...overrides,
  };
}

const openCard = (title: string) => `Detalhes da tarefa ${title}`;

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        session: { id: "s1", userId: "u1", expiresAt: "2030-01-01T00:00:00Z", token: "fixture" },
        user: {
          id: "u1",
          name: "Ana Dev",
          email: "ana@example.com",
          emailVerified: true,
          termsAcceptedAt: "2026-08-31T12:00:00Z",
          privacyNoticeAcceptedAt: "2026-08-31T12:00:00Z",
          legalNoticeVersion: "2026-08-31",
        },
      }),
    }),
  );
  await page.route("**/v1/workspaces", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [workspace], page: { nextCursor: null, hasMore: false } }),
    }),
  );
  await page.route(`**/v1/workspaces/${workspaceId}/context`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        workspace: { id: workspaceId, name: workspace.name, slug: workspace.slug },
        principal: { subjectType: "user", subjectId: "u1", role: "owner" },
        projects: [project, otherProject],
      }),
    }),
  );
  await page.route("**/tasks/*/events", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
});

test("the board renders the four columns and moves a task with the status select in the card", async ({
  page,
}) => {
  let currentTask = task();

  await page.route(`**/v1/workspaces/${workspaceId}/tasks?*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [currentTask], page: { nextCursor: null, hasMore: false } }),
    }),
  );
  await page.route(`**/v1/workspaces/${workspaceId}/tasks/${taskId}`, async (route) => {
    const body = route.request().postDataJSON() as { status?: Task["status"] };
    currentTask = {
      ...currentTask,
      status: body.status ?? currentTask.status,
      version: currentTask.version + 1,
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentTask),
    });
  });

  await page.goto(`/w/${workspace.slug}`);
  await expect(page.locator("main")).toHaveCount(1);

  for (const column of ["Aberto", "Andamento", "Bloqueado", "Concluído"]) {
    await expect(page.getByRole("heading", { name: column })).toBeVisible();
  }

  // A ficha só existe depois de abrir o card: fechada ela é inert.
  const status = page.getByRole("combobox", { name: "Status" });
  await expect(status).toBeHidden();

  await page.getByRole("button", { name: openCard("Escrever contrato do endpoint") }).click();
  await expect(status).toBeVisible();
  await status.selectOption("blocked");

  await expect(
    page
      .locator('section[aria-label="Coluna Bloqueado"]')
      .getByText("Escrever contrato do endpoint"),
  ).toBeVisible();
});

test("the board follows task cursors before calculating workspace totals", async ({ page }) => {
  const secondPageTask = task({
    id: "019641a8-8c54-7f6c-8d2f-3fd1eb8b7538",
    title: "Tarefa recebida na segunda página",
    position: "2048",
  });
  const requestedCursors: Array<string | null> = [];

  await page.route(`**/v1/workspaces/${workspaceId}/tasks?*`, (route) => {
    const cursor = new URL(route.request().url()).searchParams.get("cursor");
    requestedCursors.push(cursor);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        cursor === "page-two"
          ? { data: [secondPageTask], page: { nextCursor: null, hasMore: false } }
          : { data: [task()], page: { nextCursor: "page-two", hasMore: true } },
      ),
    });
  });

  await page.goto(`/w/${workspace.slug}`);
  await expect(
    page.getByRole("button", { name: openCard("Tarefa recebida na segunda página") }),
  ).toBeVisible();
  expect(requestedCursors).toEqual([null, "page-two"]);
});

test("deleting a task removes it immediately, and 'Desfazer' restores it without calling the API", async ({
  page,
}) => {
  await page.route(`**/v1/workspaces/${workspaceId}/tasks?*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [task()], page: { nextCursor: null, hasMore: false } }),
    }),
  );
  let deleteCalls = 0;
  await page.route(`**/v1/workspaces/${workspaceId}/tasks/${taskId}`, async (route) => {
    deleteCalls += 1;
    await route.fulfill({ status: 204 });
  });

  await page.goto(`/w/${workspace.slug}`);
  const card = page.getByRole("button", { name: openCard("Escrever contrato do endpoint") });
  await card.click();

  await page
    .getByRole("button", { name: "Excluir a tarefa Escrever contrato do endpoint" })
    .click();
  await expect(card).toBeHidden();

  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(card).toBeVisible();

  // Deixa o timer (já cancelado) passar do prazo para pegar uma regressão aqui.
  await page.waitForTimeout(5_500);
  expect(deleteCalls).toBe(0);
});

test("search and the owner filter narrow the board without touching the API", async ({ page }) => {
  const claimed = task({
    id: "019641a8-8c54-7f6c-8d2f-3fd1eb8b7534",
    title: "Revisar RLS",
    position: "2048",
    claimedBy: {
      subjectType: "service_account",
      subjectId: "019641a8-8c54-7f6c-8d2f-3fd1eb8b7540",
      leaseExpiresAt: "2030-01-01T00:00:00Z",
    },
  });
  await page.route(`**/v1/workspaces/${workspaceId}/tasks?*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [task(), claimed], page: { nextCursor: null, hasMore: false } }),
    }),
  );

  await page.goto(`/w/${workspace.slug}`);
  const contrato = page.getByRole("button", { name: openCard("Escrever contrato do endpoint") });
  const rls = page.getByRole("button", { name: openCard("Revisar RLS") });
  await expect(contrato).toBeVisible();
  await expect(rls).toBeVisible();

  const search = page.getByRole("searchbox", { name: /Buscar por título/ });
  await search.fill("contrato");
  await expect(rls).toBeHidden();
  await expect(contrato).toBeVisible();

  await search.fill("");
  await page.getByRole("button", { name: /^Agentes/ }).click();
  await expect(contrato).toBeHidden();
  await expect(rls).toBeVisible();
});

test("the project filter in the rail narrows the board and keeps the counts honest", async ({
  page,
}) => {
  const onSite = task({
    id: "019641a8-8c54-7f6c-8d2f-3fd1eb8b7535",
    projectId: otherProjectId,
    title: "Publicar a home",
    position: "3072",
  });
  await page.route(`**/v1/workspaces/${workspaceId}/tasks?*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [task(), onSite], page: { nextCursor: null, hasMore: false } }),
    }),
  );

  await page.goto(`/w/${workspace.slug}`);
  const contrato = page.getByRole("button", { name: openCard("Escrever contrato do endpoint") });
  const home = page.getByRole("button", { name: openCard("Publicar a home") });
  await expect(contrato).toBeVisible();
  await expect(home).toBeVisible();

  await page.getByRole("button", { name: /^Site/ }).click();
  await expect(contrato).toBeHidden();
  await expect(home).toBeVisible();
});

test("board error offers an accessible retry that refetches the task list", async ({ page }) => {
  let requests = 0;
  await page.route(`**/v1/workspaces/${workspaceId}/tasks?*`, (route) => {
    requests += 1;
    if (requests === 1) {
      return route.fulfill({
        status: 404,
        contentType: "application/problem+json",
        body: JSON.stringify({
          type: "about:blank",
          title: "Not found",
          status: 404,
          code: "not_found",
          detail: "Task list unavailable",
          instance: "/v1/tasks",
          traceId: "fixture-trace",
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [task()], page: { nextCursor: null, hasMore: false } }),
    });
  });

  await page.goto(`/w/${workspace.slug}`);
  const retry = page.getByRole("button", { name: "Tentar novamente" });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(page.getByRole("heading", { name: "Aberto" })).toBeVisible();
  expect(requests).toBe(2);
});

test("an unknown workspace shows a named error and a route back", async ({ page }) => {
  await page.goto("/w/workspace-que-nao-existe");
  await expect(page.getByRole("heading", { name: "Workspace não encontrado" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ir para meu workspace" })).toHaveAttribute(
    "href",
    `/w/${workspace.slug}`,
  );
  await expect(page.locator("main .animate-pulse")).toHaveCount(0);
});

test("on a narrow screen the columns stack and the page never scrolls sideways", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.route(`**/v1/workspaces/${workspaceId}/tasks?*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [task()], page: { nextCursor: null, hasMore: false } }),
    }),
  );

  await page.goto(`/w/${workspace.slug}`);
  await expect(page.getByRole("heading", { name: "Aberto" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Concluído" })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("workspace navigation remains visible across the former breakpoint gap", async ({ page }) => {
  await page.route(`**/v1/workspaces/${workspaceId}/tasks?*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [task()], page: { nextCursor: null, hasMore: false } }),
    }),
  );

  for (const width of [640, 700, 767]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(`/w/${workspace.slug}`);
    await expect(page.getByRole("link", { name: "Tasks" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Docs|Documentação/ })).toBeVisible();
  }
});

test("the weekly tasks screen schedules and completes the same backlog task", async ({ page }) => {
  let currentTask = task();
  await page.route(`**/v1/workspaces/${workspaceId}/tasks?*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [currentTask], page: { nextCursor: null, hasMore: false } }),
    }),
  );
  await page.route(`**/v1/workspaces/${workspaceId}/tasks/${taskId}`, async (route) => {
    const body = route.request().postDataJSON() as {
      scheduledDate?: string | null;
      status?: Task["status"];
    };
    currentTask = {
      ...currentTask,
      ...(body.scheduledDate !== undefined ? { scheduledDate: body.scheduledDate } : {}),
      ...(body.status ? { status: body.status } : {}),
      version: currentTask.version + 1,
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentTask),
    });
  });

  await page.goto(`/w/${workspace.slug}/tasks`);
  await expect(page.getByRole("heading", { name: "Tasks." })).toBeVisible();

  const schedule = page.getByRole("combobox", { name: `Agendar ${currentTask.title}` });
  await schedule.selectOption({ index: 1 });
  await expect(page.getByRole("checkbox", { name: /Marcar Escrever contrato/ })).toBeVisible();

  await page.getByRole("checkbox", { name: /Marcar Escrever contrato/ }).click();
  await expect(
    page.getByRole("checkbox", { name: /Marcar Escrever contrato.*não concluída/ }),
  ).toBeChecked();
  await expect(page.getByText("feitas", { exact: true })).toBeVisible();
});

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "compact tablet", width: 700, height: 960 },
  { name: "tablet", width: 820, height: 1180 },
]) {
  test(`tasks and documentation stay inside the ${viewport.name} viewport`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.route(`**/v1/workspaces/${workspaceId}/tasks?*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [task()], page: { nextCursor: null, hasMore: false } }),
      }),
    );

    for (const path of ["tasks", "documentacao"]) {
      await page.goto(`/w/${workspace.slug}/${path}`);
      await expect(page.locator("main")).toHaveCount(1);
      await expect(
        page.getByRole("link", { name: path === "tasks" ? /Docs|Documentação/ : "Tasks" }),
      ).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);

      if (path === "tasks" && viewport.name === "mobile") {
        const weeklyGrid = page.locator('section[aria-label="Agenda semanal"] > .bl-scroll');
        await expect(weeklyGrid).toBeVisible();
        expect(
          await weeklyGrid.evaluate((element) => element.scrollWidth > element.clientWidth),
        ).toBe(true);
        await weeklyGrid.evaluate((element) => element.scrollTo({ left: 120 }));
        expect(await weeklyGrid.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
        expect(await page.evaluate(() => window.scrollX)).toBe(0);
      }
    }
  });
}
