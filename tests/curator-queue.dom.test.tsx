import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { CuratorQueue } from "../src/components/CuratorQueue";

describe("CuratorQueue", () => {
  afterEach(cleanup);

  it("renders anomalies for each parcel in corpus", async () => {
    render(
      <MemoryRouter>
        <CuratorQueue />
      </MemoryRouter>,
    );
    expect((await screen.findAllByText(/304-78-386/)).length).toBeGreaterThan(
      0,
    );
    expect((await screen.findAllByText(/304-77-689/)).length).toBeGreaterThan(
      0,
    );
  });

  it("accept button appends a row to the audit log", async () => {
    render(
      <MemoryRouter>
        <CuratorQueue />
      </MemoryRouter>,
    );
    const acceptButtons = await screen.findAllByRole("button", {
      name: /accept/i,
    });
    fireEvent.click(acceptButtons[0]);
    expect(screen.getByText(/audit log/i)).toBeInTheDocument();
    expect(screen.getByText(/ACCEPTED/)).toBeInTheDocument();
  });
});
