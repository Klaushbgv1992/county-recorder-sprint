import { describe, expect, it } from "vitest";
import { renderCommitmentPdf } from "./commitment-pdf";
import { buildCommitment } from "./commitment-builder";
import { loadParcelDataByApn } from "../data-loader";
import closingImpactTemplates from "../data/closing-impact-templates.json";

describe("renderCommitmentPdf", () => {
  const data = loadParcelDataByApn("304-78-386");
  const doc = buildCommitment({
    parcel: data.parcel,
    instruments: data.instruments,
    links: data.links,
    lifecycles: data.lifecycles,
    pipelineStatus: data.pipelineStatus,
    closingImpactTemplates,
    generatedAt: "2026-04-14T12:00:00.000Z",
  });

  it("returns a Blob with application/pdf mime", () => {
    const blob = renderCommitmentPdf(doc);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
  });

  it("starts with %PDF- magic bytes", async () => {
    const blob = renderCommitmentPdf(doc);
    const buf = await blob.arrayBuffer();
    const head = new TextDecoder().decode(buf.slice(0, 5));
    expect(head).toBe("%PDF-");
  });

  it("produces a non-trivial PDF (>1KB)", () => {
    const blob = renderCommitmentPdf(doc);
    expect(blob.size).toBeGreaterThan(1024);
  });
});
