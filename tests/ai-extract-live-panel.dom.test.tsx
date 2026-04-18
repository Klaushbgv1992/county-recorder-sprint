import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AiExtractLivePanel } from "../src/components/AiExtractLivePanel";
import type { LiveExtractStreamEvent } from "../src/lib/ai-extract-prompt";

/**
 * Build a Response whose body streams the given NDJSON events, one
 * event per chunk so the React state updates land in the expected order.
 */
function ndjsonResponse(events: LiveExtractStreamEvent[]): Response {
  const enc = new TextEncoder();
  let i = 0;
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (i < events.length) {
        // Slight yield so React batches visibly; not strictly required
        await new Promise((r) => setTimeout(r, 0));
        controller.enqueue(enc.encode(JSON.stringify(events[i++]) + "\n"));
      } else {
        controller.close();
      }
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson" },
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AiExtractLivePanel", () => {
  it("shows suggested recording numbers and enables Try it live for valid input", async () => {
    render(
      <MemoryRouter>
        <AiExtractLivePanel />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /try it live/i })).toBeEnabled();
    // Suggested list links
    expect(screen.getByRole("button", { name: "20210057847" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "20210075858" })).toBeInTheDocument();
  });

  it("renders extracted fields with confidence and ai_extraction provenance on streaming response", async () => {
    const events: LiveExtractStreamEvent[] = [
      {
        type: "meta",
        recording_number: "20210057847",
        model: "claude-opus-4-7",
        started_at: "2026-04-17T00:00:00Z",
        pdf_bytes: 12345,
      },
      {
        type: "field",
        field_name: "document_type",
        value: "Deed of Trust",
        confidence: 0.96,
        reasoning: "Granting clause.",
        at_ms: 500,
      },
      {
        type: "field",
        field_name: "recording_date",
        value: "2021-01-19",
        confidence: 0.98,
        reasoning: "Recording stamp page 1.",
        at_ms: 800,
      },
      {
        type: "done",
        usage: {
          input_tokens: 1200,
          output_tokens: 150,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
        total_ms: 2500,
      },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValue(ndjsonResponse(events));

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AiExtractLivePanel />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: /try it live/i }));

    // "Deed of Trust" appears twice — once on the AI side, once on the
    // curator side — which is exactly the point of the side-by-side view.
    await waitFor(() => {
      expect(screen.getAllByText("Deed of Trust").length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText("2021-01-19").length).toBeGreaterThanOrEqual(1);
    // At least one provenance tag (one per filled field)
    expect(screen.getAllByText("ai_extraction").length).toBeGreaterThan(0);
    // Confidence badges rendered
    expect(screen.getByText(/96% conf/)).toBeInTheDocument();
    expect(screen.getByText(/98% conf/)).toBeInTheDocument();
    // Curator comparison surfaces on all 5 field cards (one per field)
    expect(screen.getAllByText(/Curator ground truth/i).length).toBe(5);
    // Done banner
    await waitFor(() => {
      expect(screen.getByText(/Extraction complete in 2500 ms/)).toBeInTheDocument();
    });
  });

  it("surfaces error events from the handler", async () => {
    const events: LiveExtractStreamEvent[] = [
      {
        type: "error",
        message: "Maricopa API returned 503",
        retriable: true,
      },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(ndjsonResponse(events));

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AiExtractLivePanel />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: /try it live/i }));
    // Error message appears twice: once in the red banner, once in the
    // raw-events JSON dump. Either is evidence of surfacing the error.
    await waitFor(() => {
      expect(
        screen.getAllByText(/Maricopa API returned 503/).length,
      ).toBeGreaterThan(0);
    });
    // The retriable hint is surfaced in the banner
    expect(screen.getByText(/This looks retriable/i)).toBeInTheDocument();
  });

  it("exposes the system prompt and model id through the disclosure", () => {
    render(
      <MemoryRouter>
        <AiExtractLivePanel />
      </MemoryRouter>,
    );
    // Disclosure summary visible in collapsed state
    expect(
      screen.getByText(/Show the exact prompt, tool schema, and raw stream events/i),
    ).toBeInTheDocument();
  });
});
