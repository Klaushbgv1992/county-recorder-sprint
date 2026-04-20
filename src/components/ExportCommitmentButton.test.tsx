import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import {
  ExportCommitmentButton,
  triggerCommitmentDownload,
} from "./ExportCommitmentButton";
import { loadParcelDataByApn } from "../data-loader";
import closingImpactTemplates from "../data/closing-impact-templates.json";

describe("triggerCommitmentDownload", () => {
  const data = loadParcelDataByApn("304-78-386");

  beforeEach(() => {
    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = vi.fn(() => "blob:mock");
    }
    if (!globalThis.URL.revokeObjectURL) {
      globalThis.URL.revokeObjectURL = vi.fn();
    }
  });

  it("returns a CommitmentDocument with the correct parcel APN", () => {
    const result = triggerCommitmentDownload({
      parcel: data.parcel,
      instruments: data.instruments,
      links: data.links,
      lifecycles: data.lifecycles,
      pipelineStatus: data.pipelineStatus,
      closingImpactTemplates,
      generatedAt: "2026-04-14T12:00:00.000Z",
      download: vi.fn(),
    });
    expect(result.doc.header.parcelApn).toBe("304-78-386");
  });

  it("forwards viewedInstrumentNumber when present", () => {
    const result = triggerCommitmentDownload({
      parcel: data.parcel,
      instruments: data.instruments,
      links: data.links,
      lifecycles: data.lifecycles,
      pipelineStatus: data.pipelineStatus,
      closingImpactTemplates,
      generatedAt: "2026-04-14T12:00:00.000Z",
      viewedInstrumentNumber: "20210075858",
      download: vi.fn(),
    });
    const lc001 = result.doc.scheduleB2.find((r) => r.lifecycleId === "lc-001")!;
    expect(lc001.viewedMarker).toBe(true);
  });

  it("invokes the download callback with the right filename", () => {
    const download = vi.fn();
    triggerCommitmentDownload({
      parcel: data.parcel,
      instruments: data.instruments,
      links: data.links,
      lifecycles: data.lifecycles,
      pipelineStatus: data.pipelineStatus,
      closingImpactTemplates,
      generatedAt: "2026-04-14T12:00:00.000Z",
      download,
    });
    expect(download).toHaveBeenCalledTimes(1);
    const [blob, filename] = download.mock.calls[0];
    expect(blob.type).toBe("application/pdf");
    expect(filename).toMatch(/^commitment-30478386-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it("uses verifiedThroughDate (not generatedAt) for the filename date suffix", () => {
    const download = vi.fn();
    triggerCommitmentDownload({
      parcel: data.parcel,
      instruments: data.instruments,
      links: data.links,
      lifecycles: data.lifecycles,
      pipelineStatus: data.pipelineStatus,
      closingImpactTemplates,
      generatedAt: "2026-04-14T12:00:00.000Z",
      download,
    });
    const [, filename] = download.mock.calls[0];
    expect(filename).toBe("commitment-30478386-2026-04-12.pdf");
  });
});

describe("ExportCommitmentButton — toast UX", () => {
  const data = loadParcelDataByApn("304-78-386");

  beforeEach(() => {
    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = vi.fn(() => "blob:mock");
    }
    if (!globalThis.URL.revokeObjectURL) {
      globalThis.URL.revokeObjectURL = vi.fn();
    }
  });

  afterEach(() => cleanup());

  it("shows a 'Downloaded:' toast with the filename after click resolves", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ExportCommitmentButton
          parcel={data.parcel}
          instruments={data.instruments}
          links={data.links}
          lifecycles={data.lifecycles}
          pipelineStatus={data.pipelineStatus}
        />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: /Export Commitment/i }));
    await screen.findByText(/Downloaded: commitment-30478386-/i, undefined, {
      timeout: 2000,
    });
  });
});
