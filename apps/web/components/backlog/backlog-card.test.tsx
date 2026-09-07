import { DndContext, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BacklogCard } from "@/components/backlog/backlog-card";
import type { BoardTask } from "@/lib/backlog/board-task";

const task: BoardTask = {
  id: "019641a8-8c54-7f6c-8d2f-3fd1eb8b7531",
  workspaceId: "019641a8-8c54-7f6c-8d2f-3fd1eb8b7532",
  projectId: "019641a8-8c54-7f6c-8d2f-3fd1eb8b7533",
  title: "Escrever contrato do endpoint",
  description: "Falta decidir o formato do erro.",
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
};

function Harness({ children }: { children: React.ReactNode }) {
  // Espelha o backlog-view: só o Espaço inicia arrasto por teclado, para o Enter
  // continuar nativo no botão que abre a ficha dentro do card.
  const sensors = useSensors(
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <DndContext sensors={sensors}>{children}</DndContext>
    </QueryClientProvider>
  );
}

function renderCard(overrides: Partial<Parameters<typeof BacklogCard>[0]> = {}) {
  const props = {
    task,
    owner: "free" as const,
    days: 3,
    projectName: "Plataforma",
    workspaceId: task.workspaceId,
    open: false,
    onToggle: vi.fn(),
    onChangeStatus: vi.fn(),
    onChangePriority: vi.fn(),
    onChangeDueDate: vi.fn(),
    onOpenDetails: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  render(
    <Harness>
      <BacklogCard {...props} />
    </Harness>,
  );
  return props;
}

describe("BacklogCard", () => {
  it("names the toggle by the task and reports the collapsed state", () => {
    renderCard();
    const toggle = screen.getByRole("button", {
      name: "Detalhes da tarefa Escrever contrato do endpoint",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    // A idade aparece duas vezes: na etiqueta e na ficha. A primeira é a etiqueta.
    expect(screen.getAllByText("3 dias")[0]).toBeInTheDocument();
  });

  it("opens on click and on Enter, without the drag sensor swallowing the key", async () => {
    const user = userEvent.setup();
    const { onToggle } = renderCard();
    const toggle = screen.getByRole("button", { name: /Detalhes da tarefa/ });

    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);

    toggle.focus();
    await user.keyboard("{Enter}");
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("keeps the collapsed sheet inert so its controls are not reachable", () => {
    renderCard();
    expect(screen.getByRole("combobox", { name: "Status" }).closest("[inert]")).not.toBeNull();
  });

  it("changes status and priority from the open sheet", () => {
    const { onChangeStatus, onChangePriority, onChangeDueDate } = renderCard({ open: true });

    fireEvent.change(screen.getByRole("combobox", { name: "Status" }), {
      target: { value: "blocked" },
    });
    expect(onChangeStatus).toHaveBeenCalledWith("blocked");

    fireEvent.change(screen.getByRole("combobox", { name: "Prioridade" }), {
      target: { value: "urgent" },
    });
    expect(onChangePriority).toHaveBeenCalledWith("urgent");

    fireEvent.change(screen.getByLabelText("Prazo"), { target: { value: "2026-09-08" } });
    expect(onChangeDueDate).toHaveBeenCalledWith("2026-09-08");
  });

  it("offers the full record and the delete action in the open sheet", () => {
    const { onOpenDetails, onDelete } = renderCard({ open: true });

    fireEvent.click(screen.getByRole("button", { name: "Ficha completa" }));
    expect(onOpenDetails).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("button", { name: "Excluir a tarefa Escrever contrato do endpoint" }),
    );
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("marks the aging badge as stale only past the 14-day limit", () => {
    renderCard({ days: 21 });
    expect(screen.getAllByText("21 dias")[0]?.className).toContain("stale");
  });
});
