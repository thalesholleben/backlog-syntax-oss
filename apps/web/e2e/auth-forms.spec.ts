import { expect, test } from "@playwright/test";

test("session verification failure leaves the password form usable", async ({ page }) => {
  await page.route("**/api/auth/get-session*", (route) => route.abort("connectionrefused"));
  await page.goto("/entrar");
  await expect(
    page.getByRole("alert").filter({ hasText: "Não foi possível verificar sua sessão" }),
  ).toBeVisible();
  await page.getByLabel("Senha", { exact: true }).fill("still-usable");
  await expect(page.getByLabel("Senha", { exact: true })).toHaveValue("still-usable");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("sign-up shows accessible zod validation errors instead of submitting", async ({ page }) => {
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Ana Dev");
  await page.getByLabel("E-mail").fill("ana@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("123");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "pelo menos 12 caracteres" }),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "aceitar os termos de uso" }),
  ).toBeVisible();
  // Still on /cadastro: no network call happened for an invalid submission.
  await expect(page).toHaveURL(/\/cadastro$/);
});

test("password field toggles visibility accessibly", async ({ page }) => {
  await page.goto("/entrar");
  const password = page.getByLabel("Senha", { exact: true });
  await password.fill("segredo123");
  await expect(password).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(page.getByRole("button", { name: "Ocultar senha" })).toBeVisible();
});

test("sign-in redirects to onboarding on a mocked successful session (explicit fixture)", async ({
  page,
}) => {
  let signedIn = false;
  await page.route("**/api/auth/sign-in/email", (route) => {
    signedIn = true;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: "fixture-token",
        user: { id: "u1", email: "ana@example.com" },
      }),
    });
  });
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        signedIn
          ? {
              session: {
                id: "s1",
                userId: "u1",
                expiresAt: "2030-01-01T00:00:00Z",
                token: "fixture-token",
              },
              user: {
                id: "u1",
                name: "Ana Dev",
                email: "ana@example.com",
                emailVerified: true,
                termsAcceptedAt: "2026-08-31T12:00:00Z",
                privacyNoticeAcceptedAt: "2026-08-31T12:00:00Z",
                legalNoticeVersion: "2026-08-31",
              },
            }
          : null,
      ),
    }),
  );
  await page.route("**/v1/workspaces", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], page: { nextCursor: null, hasMore: false } }),
    }),
  );

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("ana@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("segredo123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { name: "Escolha um workspace" })).toBeVisible();
});

test("sign-in opens the first existing workspace instead of sending its owner through onboarding", async ({
  page,
}) => {
  let signedIn = false;
  await page.route("**/api/auth/sign-in/email", (route) => {
    signedIn = true;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: "fixture-token",
        user: { id: "u1", email: "ana@example.com" },
      }),
    });
  });
  await page.route("**/api/auth/get-session*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        signedIn
          ? {
              session: { id: "s1", userId: "u1", expiresAt: "2030-01-01T00:00:00Z" },
              user: {
                id: "u1",
                name: "Ana Dev",
                email: "ana@example.com",
                emailVerified: true,
                termsAcceptedAt: "2026-08-31T12:00:00Z",
                privacyNoticeAcceptedAt: "2026-08-31T12:00:00Z",
                legalNoticeVersion: "2026-08-31",
              },
            }
          : null,
      ),
    }),
  );
  await page.route("**/v1/workspaces", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [{ id: "w1", name: "Meu SaaS", slug: "meu-saas", role: "owner" }],
        page: { nextCursor: null, hasMore: false },
      }),
    }),
  );

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("ana@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("segredo123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  await expect(page).toHaveURL(/\/w\/meu-saas$/);
});

test("sign-in shows a generic error for wrong credentials without revealing which field was wrong", async ({
  page,
}) => {
  await page.route("**/api/auth/sign-in/email", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Invalid email or password",
      }),
    }),
  );

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("ana@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "E-mail ou senha inválidos." }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/entrar$/);
});
