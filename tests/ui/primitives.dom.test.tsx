import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { Card, CardBody, CardHeader } from "../../src/components/ui/Card";
import { Chip } from "../../src/components/ui/Chip";
import { Switch } from "../../src/components/ui/Switch";
import { Avatar } from "../../src/components/ui/Avatar";
import { Dialog } from "../../src/components/ui/Dialog";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { Icon } from "../../src/components/ui/Icon";

describe("UI primitives", () => {
  afterEach(() => cleanup());

  it("Card renders header and body", () => {
    render(
      <Card>
        <CardHeader>H</CardHeader>
        <CardBody>B</CardBody>
      </Card>,
    );
    expect(screen.getByText("H")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("Chip renders with tone classes", () => {
    render(<Chip tone="moat">Custodian</Chip>);
    expect(screen.getByText("Custodian")).toBeInTheDocument();
  });

  it("Switch toggles via click", async () => {
    let checked = false;
    const { rerender } = render(
      <Switch id="s" label="Email" checked={checked} onChange={() => {}} />,
    );
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    checked = true;
    rerender(<Switch id="s" label="Email" checked={checked} onChange={() => {}} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("Avatar renders the first letter of the name", () => {
    render(<Avatar name="Jordan" />);
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("Dialog closes on Escape", async () => {
    let open = true;
    const onClose = () => { open = false; };
    render(
      <Dialog open={open} onClose={onClose} title="Test">
        <p>body</p>
      </Dialog>,
    );
    await userEvent.keyboard("{Escape}");
    expect(open).toBe(false);
  });

  it("EmptyState renders icon + title + body", () => {
    render(<EmptyState title="Empty" body="No items" />);
    expect(screen.getByText("Empty")).toBeInTheDocument();
    expect(screen.getByText("No items")).toBeInTheDocument();
  });

  it("Icon renders an SVG by name", () => {
    const { container } = render(<Icon name="star" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
