import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Tabs } from "@/components/ui/tabs";

const items = [
  { value: "open", label: "Aberto" },
  { value: "blocked", label: "Bloqueado" },
  { value: "done", label: "Concluído" },
] as const;

function ControlledTabs() {
  const [value, setValue] = useState<string>("open");
  return <Tabs items={items} value={value} onChange={setValue} />;
}

describe("Tabs (mobile state switcher)", () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    scrollIntoView.mockClear();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });

  it("marks only the active tab as selected and keeps the rest out of tab order", () => {
    render(<ControlledTabs />);
    const active = screen.getByRole("tab", { name: "Aberto" });
    const inactive = screen.getByRole("tab", { name: "Bloqueado" });
    expect(active).toHaveAttribute("aria-selected", "true");
    expect(active).toHaveAttribute("tabIndex", "0");
    expect(inactive).toHaveAttribute("aria-selected", "false");
    expect(inactive).toHaveAttribute("tabIndex", "-1");
  });

  it("moves selection with ArrowRight/ArrowLeft, wrapping at the ends", async () => {
    const user = userEvent.setup();
    render(<ControlledTabs />);

    screen.getByRole("tab", { name: "Aberto" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Bloqueado" })).toHaveAttribute("aria-selected", "true");
    expect(scrollIntoView).toHaveBeenLastCalledWith({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Concluído" })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Aberto" })).toHaveAttribute("aria-selected", "true");
  });
});
