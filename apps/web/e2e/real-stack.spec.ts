import { expect, test } from "@playwright/test";

for (const locale of ["pt-BR", "en"] as const) {
  const en = locale === "en";
  const copy = (pt: string, english: string) => (en ? english : pt);
  test(`creates and reloads a task through web, API and PostgreSQL (${locale})`, async ({
    page,
  }) => {
    test.skip(process.env.RUN_REAL_STACK !== "true", "Requires the Docker integration stack");
    test.setTimeout(60_000);

    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const email = `browser-${suffix}@integration.test`;
    const workspaceName = `Workspace ${suffix}`;
    const projectName = `Projeto ${suffix}`;
    const taskTitle = `Tarefa persistida ${suffix}`;

    await page.goto(copy("/cadastro", "/en/sign-up"));
    await page.getByLabel(copy("Nome", "Name")).fill("Browser Integration");
    await page.getByLabel(copy("E-mail", "Email")).fill(email);
    await page
      .getByLabel(copy("Senha", "Password"), { exact: true })
      .fill("Browser-integration-2026");
    await page.getByLabel(en ? /I have read and accept the/ : /Li e aceito os/).check();
    await page
      .getByLabel(en ? /I have read the Privacy notice/ : /Li o Aviso de privacidade/)
      .check();
    const signupResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/auth/sign-up/email"),
    );
    await page
      .getByRole("button", { name: copy("Criar conta", "Create account"), exact: true })
      .click();
    const signup = await signupResponse;
    expect(signup.status()).toBe(200);
    await expect
      .poll(async () => (await page.context().cookies()).map((cookie) => cookie.name))
      .toContain("backlog_session");

    await expect(page).toHaveURL(/\/onboarding$/);
    await page.getByLabel(copy("Novo workspace", "New workspace")).fill(workspaceName);
    await page.getByRole("button", { name: copy("Criar workspace", "Create workspace") }).click();
    await expect(
      page.getByRole("heading", { name: copy("Primeiro projeto", "First project") }),
    ).toBeVisible();
    await page.getByLabel(copy("Novo projeto", "New project")).fill(projectName);
    await page
      .getByRole("button", {
        name: copy("Criar projeto e abrir o quadro", "Create project and open board"),
      })
      .click();

    await expect(page.getByRole("button", { name: copy("Nova tarefa", "New task") })).toBeVisible();
    await page.getByRole("button", { name: copy("Nova tarefa", "New task") }).click();
    await page.getByRole("dialog").getByLabel(copy("Título", "Title")).fill(taskTitle);
    await page.getByRole("button", { name: copy("Adicionar tarefa", "Add task") }).click();
    const persistedTask = page
      .getByRole("button", {
        name: en ? `Task details: ${taskTitle}` : `Detalhes da tarefa ${taskTitle}`,
      })
      .first();
    await expect(persistedTask).toBeVisible();

    await page.reload();
    await expect(persistedTask).toBeVisible();

    const workspaceUrl = page.url().replace(/\/(?:projetos|projects)\/.*$/, "");
    await page.goto(copy("/", "/en"));
    await page
      .getByRole("link", { name: copy("Entrar", "Sign in"), exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(workspaceUrl);
    await expect(page.getByLabel(copy("Senha", "Password"), { exact: true })).toHaveCount(0);
    await page.goto(copy("/cadastro", "/en/sign-up"));
    await expect(page).toHaveURL(workspaceUrl);

    await page.getByRole("button", { name: copy("Menu da conta", "Account menu") }).click();
    await page.getByRole("menuitem", { name: copy("Sair", "Sign out") }).click();
    await expect(page).toHaveURL(en ? /\/en\/sign-in$/ : /\/entrar$/);
    await expect(page.getByLabel(copy("Senha", "Password"), { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(copy("Senha", "Password"), { exact: true })).toBeVisible();
    await expect(page).toHaveURL(en ? /\/en\/sign-in$/ : /\/entrar$/);

    await page.getByLabel(copy("E-mail", "Email"), { exact: true }).fill(email);
    await page
      .getByLabel(copy("Senha", "Password"), { exact: true })
      .fill("Browser-integration-2026");
    await page.getByRole("button", { name: copy("Entrar", "Sign in"), exact: true }).click();
    await expect(page).toHaveURL(workspaceUrl);
    // Reproduce the reported client-side navigation, including a previously visited login page.
    await page
      .locator(en ? 'header a[href="/en"]' : 'header a[href="/"]')
      .first()
      .click();
    await page
      .getByRole("link", { name: copy("Entrar", "Sign in"), exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(workspaceUrl);
    await expect(page.getByLabel(copy("Senha", "Password"), { exact: true })).toHaveCount(0);
  });
}
