import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { EnterprisePage } from "./EnterprisePage";

function Wrap({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe("EnterprisePage", () => {
  afterEach(() => cleanup());

  it("renders the hero headline and three pricing tiers", () => {
    render(<EnterprisePage />, { wrapper: Wrap });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /license the county's data/i,
    );
    expect(screen.getByText(/per-record api/i)).toBeInTheDocument();
    expect(screen.getByText(/parcel commitment feed/i)).toBeInTheDocument();
    expect(screen.getByText(/bulk enterprise license/i)).toBeInTheDocument();
  });

  it("renders a sample endpoint JSON with a copy button", () => {
    render(<EnterprisePage />, { wrapper: Wrap });
    expect(screen.getByText(/GET \/v1\/instruments\/20210075858/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("links 'Why this beats a plant' to /why", () => {
    render(<EnterprisePage />, { wrapper: Wrap });
    const link = screen.getByRole("link", { name: /why this beats a plant/i });
    expect(link).toHaveAttribute("href", "/why");
  });

  it("API-key form transitions to a stub success state on submit", async () => {
    render(<EnterprisePage />, { wrapper: Wrap });
    const email = screen.getByPlaceholderText(/you@agency\.com/i);
    const org = screen.getByPlaceholderText(/sunbelt title/i);
    const submit = screen.getByRole("button", { name: /request api key/i });

    await userEvent.type(email, "demo@agency.com");
    await userEvent.type(org, "Demo Title Co");
    await userEvent.click(submit);

    expect(screen.getByText(/request received — prototype stub/i)).toBeInTheDocument();
    expect(screen.getByText(/demo@agency\.com/)).toBeInTheDocument();
  });

  it("sets page title + meta description on mount", () => {
    render(<EnterprisePage />, { wrapper: Wrap });
    expect(document.title).toMatch(/enterprise data feed/i);
    const meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    expect(meta?.getAttribute("content")).toMatch(/county-licensed data feed/i);
  });
});
