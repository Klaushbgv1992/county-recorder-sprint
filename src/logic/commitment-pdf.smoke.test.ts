import { writeFileSync, mkdirSync } from "node:fs";
import { describe, it } from "vitest";
import { buildCommitment } from "./commitment-builder";
import { renderCommitmentPdf } from "./commitment-pdf";
import { loadParcelDataByApn } from "../data-loader";
import closingImpactTemplates from "../data/closing-impact-templates.json";

describe.skip("PDF smoke (manual run only)", () => {
  it("writes tmp/smoke-commitment.pdf", async () => {
    const data = loadParcelDataByApn("304-78-386");
    const doc = buildCommitment({
      parcel: data.parcel,
      instruments: data.instruments,
      links: data.links,
      lifecycles: data.lifecycles,
      pipelineStatus: data.pipelineStatus,
      closingImpactTemplates,
      generatedAt: new Date().toISOString(),
    });
    const blob = renderCommitmentPdf(doc);
    const buf = Buffer.from(await blob.arrayBuffer());
    mkdirSync("tmp", { recursive: true });
    writeFileSync("tmp/smoke-commitment.pdf", buf);
  });
});
