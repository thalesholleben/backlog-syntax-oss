import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ChangePasswordForm,
  changePasswordServerMessage,
} from "@/components/auth/change-password-form";
import { english } from "@/lib/i18n/messages";
import { createTranslator } from "@/lib/i18n/translate";

const changePassword = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    changePassword: (...args: unknown[]) => changePassword(...args),
  },
}));

const pt = createTranslator("pt-BR", english);
const en = createTranslator("en", english);

describe("change password form", () => {
  beforeEach(() => {
    changePassword.mockReset();
    changePassword.mockResolvedValue({ data: {}, error: null });
  });

  it("refuses a new password shorter than the server minimum without calling the server", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await user.type(screen.getByLabelText("Senha atual"), "senha-atual-valida");
    await user.type(screen.getByLabelText("Nova senha"), "curta");
    await user.type(screen.getByLabelText("Confirmar a nova senha"), "curta");
    await user.click(screen.getByRole("button", { name: "Trocar a senha" }));

    expect(await screen.findByText("A senha precisa ter pelo menos 12 caracteres.")).toBeTruthy();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("refuses a confirmation that does not match, without calling the server", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await user.type(screen.getByLabelText("Senha atual"), "senha-atual-valida");
    await user.type(screen.getByLabelText("Nova senha"), "senha-nova-bem-longa");
    await user.type(screen.getByLabelText("Confirmar a nova senha"), "senha-nova-diferente");
    await user.click(screen.getByRole("button", { name: "Trocar a senha" }));

    expect(await screen.findByText("A confirmação não confere com a nova senha.")).toBeTruthy();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("ends the other sessions when it does call the server", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await user.type(screen.getByLabelText("Senha atual"), "senha-atual-valida");
    await user.type(screen.getByLabelText("Nova senha"), "senha-nova-bem-longa");
    await user.type(screen.getByLabelText("Confirmar a nova senha"), "senha-nova-bem-longa");
    await user.click(screen.getByRole("button", { name: "Trocar a senha" }));

    expect(await screen.findByRole("status")).toBeTruthy();
    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: "senha-atual-valida",
      newPassword: "senha-nova-bem-longa",
      revokeOtherSessions: true,
    });
  });

  it("shows a wrong current password as its own message, in both languages", async () => {
    const user = userEvent.setup();
    changePassword.mockResolvedValue({ data: null, error: { code: "INVALID_PASSWORD" } });
    render(<ChangePasswordForm />);

    await user.type(screen.getByLabelText("Senha atual"), "senha-errada-porem-longa");
    await user.type(screen.getByLabelText("Nova senha"), "senha-nova-bem-longa");
    await user.type(screen.getByLabelText("Confirmar a nova senha"), "senha-nova-bem-longa");
    await user.click(screen.getByRole("button", { name: "Trocar a senha" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "A senha atual não confere.",
    );
    expect(changePasswordServerMessage("INVALID_PASSWORD", en)).toBe(
      "That is not your current password.",
    );
  });

  /* O texto cru do Better Auth não é traduzido e às vezes descreve o banco em vez do que a
     pessoa fez, então nenhum código pode escapar sem mensagem própria. */
  it("translates every handled code and never leaks the raw provider text", () => {
    for (const translate of [pt, en]) {
      for (const code of ["INVALID_PASSWORD", "CREDENTIAL_ACCOUNT_NOT_FOUND", undefined]) {
        const message = changePasswordServerMessage(code, translate);
        expect(message.length).toBeGreaterThan(0);
        expect(message).not.toContain("_");
      }
    }
    expect(changePasswordServerMessage("CREDENTIAL_ACCOUNT_NOT_FOUND", pt)).toBe(
      "Esta conta entra por um provedor externo e não tem senha para trocar.",
    );
    expect(changePasswordServerMessage("CREDENTIAL_ACCOUNT_NOT_FOUND", en)).toBe(
      "This account signs in through an external provider and has no password to change.",
    );
    expect(changePasswordServerMessage("SOMETHING_UNMAPPED", pt)).toBe(
      "Não foi possível trocar a senha agora. Tente de novo em instantes.",
    );
  });
});
