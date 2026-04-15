import { describe, expect, it } from "vitest";
import { renderCommitmentPdf } from "./commitment-pdf";
import { buildCommitment } from "./commitment-builder";
import { loadParcelDataByApn } from "../data-loader";
import { detectAnomalies } from "./anomaly-detector";
import { generateScheduleBI } from "./schedule-bi-generator";
import closingImpactTemplates from "../data/closing-impact-templates.json";
import type { BIItem, TransactionInputs } from "../types/commitment";

async function extractPdfText(blob: Blob): Promise<string> {
  // jsPDF emits a stream where text is rendered via Tj/TJ operators with
  // ASCII string literals. Decoding the raw bytes as latin1 is enough to
  // expose the user-visible text for substring assertions.
  const buf = await blob.arrayBuffer();
  return new TextDecoder("latin1").decode(buf);
}

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

  describe("Schedule B-I rendering", () => {
    const transactionInputs: TransactionInputs = {
      transaction_type: "refinance",
      effective_date: "2026-04-14",
      buyer_or_borrower: "POPHAM CHRISTOPHER/ASHLEY",
      new_lender: "ACME BANK, N.A.",
    };

    const fakeItems: BIItem[] = [
      {
        item_id: "BI-TEST-1",
        text: "UniqueTextAlpha: first B-I requirement.",
        why: "UniqueWhyAlpha: rationale for first.",
        template_id: "BI-TEST",
        origin_anomaly_id: null,
        origin_lifecycle_id: null,
      },
      {
        item_id: "BI-TEST-2",
        text: "UniqueTextBeta: second B-I requirement.",
        why: "UniqueWhyBeta: rationale for second.",
        template_id: "BI-TEST",
        origin_anomaly_id: null,
        origin_lifecycle_id: null,
      },
      {
        item_id: "BI-TEST-3",
        text: "UniqueTextGamma: third B-I requirement.",
        why: "UniqueWhyGamma: rationale for third.",
        template_id: "BI-TEST",
        origin_anomaly_id: null,
        origin_lifecycle_id: null,
      },
    ];

    it("renders a Schedule B-I heading and item text + why when biItems are provided", async () => {
      const blob = renderCommitmentPdf(doc, {
        biItems: fakeItems,
        transactionInputs,
      });
      const text = await extractPdfText(blob);
      expect(text).toMatch(/Schedule B-I (\u2014|--) Requirements/);
      expect(text).toContain("UniqueTextAlpha");
      expect(text).toContain("UniqueTextBeta");
      expect(text).toContain("UniqueTextGamma");
      expect(text).toContain("Why this item");
      expect(text).toContain("UniqueWhyAlpha");
      expect(text).toContain("UniqueWhyBeta");
      expect(text).toContain("UniqueWhyGamma");
    });

    it("numbers items 1-based and sequential", async () => {
      const blob = renderCommitmentPdf(doc, {
        biItems: fakeItems,
        transactionInputs,
      });
      const text = await extractPdfText(blob);
      // Each "N. UniqueText..." should appear with its expected index.
      expect(text).toContain("1. UniqueTextAlpha");
      expect(text).toContain("2. UniqueTextBeta");
      expect(text).toContain("3. UniqueTextGamma");
    });

    it("includes the transaction summary below the heading", async () => {
      const blob = renderCommitmentPdf(doc, {
        biItems: fakeItems,
        transactionInputs,
      });
      const text = await extractPdfText(blob);
      expect(text).toContain("Refinance");
      expect(text).toContain("2026-04-14");
      expect(text).toContain("POPHAM CHRISTOPHER/ASHLEY");
      expect(text).toContain("ACME BANK, N.A.");
    });

    it("omits Schedule B-I when biItems are absent (default call)", async () => {
      const blob = renderCommitmentPdf(doc);
      const text = await extractPdfText(blob);
      expect(text).not.toContain("Schedule B-I \u2014 Requirements");
      expect(text).not.toContain("Schedule B-I -- Requirements");
      expect(text).not.toContain("Why this item");
      // Schedule B-II should still be present.
      expect(text).toContain("Schedule B-II");
    });

    it("omits Schedule B-I when biItems is an empty array", async () => {
      const blob = renderCommitmentPdf(doc, { biItems: [] });
      const text = await extractPdfText(blob);
      expect(text).not.toContain("Schedule B-I \u2014 Requirements");
      expect(text).not.toContain("Schedule B-I -- Requirements");
      expect(text).toContain("Schedule B-II");
    });

    it("builds a valid PDF from POPHAM data + a live generated B-I set (smoke)", () => {
      const anomalies = detectAnomalies("304-78-386");
      const items = generateScheduleBI({
        apn: "304-78-386",
        lifecycles: data.lifecycles,
        anomalies,
        instruments: data.instruments,
        parcel: data.parcel,
        inputs: transactionInputs,
      });
      expect(items.length).toBeGreaterThan(0);
      const blob = renderCommitmentPdf(doc, {
        biItems: items,
        transactionInputs,
      });
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("application/pdf");
      expect(blob.size).toBeGreaterThan(1024);
    });
  });
});
