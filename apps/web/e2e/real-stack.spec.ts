import { expect, test } from "@playwright/test";

test("creates and reloads a task through web, API and PostgreSQL", async ({ page }) => {
  test.skip(process.env.RUN_REAL_STACK !== "true", "Requires the Docker integration stack");
  test.setTimeout(60_000);

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const email = `browser-${suffix}@integration.test`;
  const workspaceName = `Workspace ${suffix}`;
  const projectName = `Projeto ${suffix}`;
  const taskTitle = `Tarefa persistida ${suffix}`;

  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Browser Integration");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("Browser-integration-2026");
  await page.getByLabel(/Li e aceito os/).check();
  await page.getByLabel(/Li o Aviso de privacidade/).check();
  const signupResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/auth/sign-up/email"),
  );
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  const signup = await signupResponse;
  expect(signup.status()).toBe(200);
  await expect
    .poll(async () => (await page.context().cookies()).map((cookie) => cookie.name))
    .toContain("backlog_session");

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Novo workspace").fill(workspaceName);
  await page.getByRole("button", { name: "Criar workspace" }).click();
  await expect(page.getByRole("heading", { name: "Primeiro projeto" })).toBeVisible();
  await page.getByLabel("Novo projeto").fill(projectName);
  await page.getByRole("button", { name: "Criar projeto e abrir o quadro" }).click();

  await expect(page.getByRole("button", { name: "Nova tarefa" })).toBeVisible();
  await page.getByRole("button", { name: "Nova tarefa" }).click();
  await page.getByRole("dialog").getByLabel("Título").fill(taskTitle);
  await page.getByRole("button", { name: "Adicionar tarefa" }).click();
  const persistedTask = page
    .getByRole("button", { name: `Detalhes da tarefa ${taskTitle}` })
    .first();
  await expect(persistedTask).toBeVisible();

  await page.reload();
  await expect(persistedTask).toBeVisible();

  const workspaceUrl = page.url().replace(/\/projetos\/.*$/, "");
  await page.goto("/");
  await page.getByRole("link", { name: "Entrar", exact: true }).first().click();
  await expect(page).toHaveURL(workspaceUrl);
  await expect(page.getByLabel("Senha", { exact: true })).toHaveCount(0);
  await page.goto("/cadastro");
  await expect(page).toHaveURL(workspaceUrl);

  await page.getByRole("button", { name: "Menu da conta" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/entrar$/);

  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("Browser-integration-2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(workspaceUrl);
  // Reproduce the reported client-side navigation, including a previously visited login page.
  await page.locator('header a[href="/"]').first().click();
  await page.getByRole("link", { name: "Entrar", exact: true }).first().click();
  await expect(page).toHaveURL(workspaceUrl);
  await expect(page.getByLabel("Senha", { exact: true })).toHaveCount(0);
});
