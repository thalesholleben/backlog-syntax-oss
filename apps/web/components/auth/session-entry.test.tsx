import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionEntry } from "@/components/auth/session-entry";
import { ApiError } from "@/lib/api/client";

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  getSession: vi.fn(),
  listWorkspaces: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/lib/auth-client", () => ({ authClient: { getSession: mocks.getSession } }));
vi.mock("@/lib/api/workspaces", () => ({ listWorkspaces: mocks.listWorkspaces }));

const session = {
  session: { id: "session-fixture" },
  user: {
    id: "user-fixture",
    termsAcceptedAt: "2026-09-06",
    privacyNoticeAcceptedAt: "2026-09-06",
    legalNoticeVersion: "2026-09-05",
  },
};
function mount() {
  return render(
    <SessionEntry>
      <label>
        Senha
        <input type="password" />
      </label>
    </SessionEntry>,
  );
}

describe("SessionEntry", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getSession.mockResolvedValue({ data: null, error: null });
    mocks.listWorkspaces.mockResolvedValue([]);
  });
  afterEach(() => vi.useRealTimers());

  it("waits for server confirmation without flashing a credential form", async () => {
    mocks.getSession.mockResolvedValue({ data: session, error: null });
    mocks.listWorkspaces.mockResolvedValue([{ slug: "meu-workspace" }]);
    mount();
    expect(screen.getByRole("status")).toBeVisible();
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith("/w/meu-workspace"));
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
    expect(mocks.getSession).toHaveBeenCalledWith({
      query: { disableCookieCache: true },
      fetchOptions: { signal: expect.any(AbortSignal), cache: "no-store" },
    });
  });

  it.each([null, { error: { status: 401 } }])(
    "keeps missing/revoked sessions on the guest form: %j",
    async (result) => {
      mocks.getSession.mockResolvedValue(result ?? { data: null });
      mount();
      expect(await screen.findByLabelText("Senha")).toBeVisible();
      expect(mocks.router.replace).not.toHaveBeenCalled();
      expect(mocks.listWorkspaces).not.toHaveBeenCalled();
    },
  );

  it("opens onboarding only for a successful empty workspace list", async () => {
    mocks.getSession.mockResolvedValue({ data: session });
    mount();
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith("/onboarding"));
  });

  it("preserves the legal-acceptance gate before reading workspaces", async () => {
    mocks.getSession.mockResolvedValue({
      data: { ...session, user: { ...session.user, termsAcceptedAt: null } },
    });
    mount();
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith("/aceitar-termos"));
    expect(mocks.listWorkspaces).not.toHaveBeenCalled();
  });

  it("returns to the form if the session is revoked during workspace loading", async () => {
    mocks.getSession.mockResolvedValue({ data: session });
    mocks.listWorkspaces.mockRejectedValue(
      new ApiError({
        type: "about:blank",
        title: "Unauthorized",
        status: 401,
        code: "unauthenticated",
        traceId: "fixture",
      }),
    );
    mount();
    expect(await screen.findByLabelText("Senha")).toBeVisible();
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });

  it.each(["network", "server"])(
    "keeps the form usable when session verification fails: %s",
    async (failure) => {
      if (failure === "network") mocks.getSession.mockRejectedValue(new TypeError("offline"));
      else mocks.getSession.mockResolvedValue({ error: { status: 503 } });
      mount();
      expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível verificar");
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Senha"), "can-still-type");
      expect(screen.getByLabelText("Senha")).toHaveValue("can-still-type");
      mocks.getSession.mockResolvedValue({ data: session });
      await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
      await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith("/onboarding"));
    },
  );

  it("does not turn a workspace outage into a false session expiry or empty onboarding", async () => {
    mocks.getSession.mockResolvedValue({ data: session });
    mocks.listWorkspaces.mockRejectedValue(new Error("offline"));
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("Sua sessão está ativa");
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });

  it("bounds a stalled verification and ignores its late success", async () => {
    vi.useFakeTimers();
    let resolveSession: (value: unknown) => void = () => {};
    mocks.getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve;
        }),
    );
    mount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(screen.getByLabelText("Senha")).toBeVisible();
    expect(screen.getByRole("alert")).toBeVisible();
    await act(async () => {
      resolveSession({ data: session });
    });
    expect(mocks.listWorkspaces).not.toHaveBeenCalled();
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });

  it("ignores a workspace response after unmount and encodes redirect segments", async () => {
    mocks.getSession.mockResolvedValue({ data: session });
    mocks.listWorkspaces.mockResolvedValue([{ slug: "//external.invalid" }]);
    const view = mount();
    await waitFor(() =>
      expect(mocks.router.replace).toHaveBeenCalledWith("/w/%2F%2Fexternal.invalid"),
    );
    view.unmount();
    mocks.router.replace.mockClear();
    let resolveWorkspaces: (value: unknown) => void = () => {};
    mocks.listWorkspaces.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveWorkspaces = resolve;
        }),
    );
    const pending = mount();
    await waitFor(() => expect(mocks.listWorkspaces).toHaveBeenCalledTimes(2));
    pending.unmount();
    await act(async () => {
      resolveWorkspaces([{ slug: "too-late" }]);
    });
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
});
