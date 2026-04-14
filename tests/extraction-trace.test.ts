import { describe, it, expect } from "vitest";
import {
  getExtractionTrace,
  hasExtractionTrace,
  totalOcrWordCount,
} from "../src/logic/extraction-trace";

describe("extraction-trace loader", () => {
  it("returns a real trace for POPHAM 2013 warranty deed", () => {
    const trace = getExtractionTrace("20130183449");
    expect(trace).not.toBeNull();
    expect(trace!.instrument_number).toBe("20130183449");
    expect(trace!.ocr_engine).toBe("tesseract");
    // Version string should look like "tesseract 4.x" or "tesseract 5.x"
    expect(trace!.ocr_version).toMatch(/^tesseract \d/);
  });

  it("POPHAM trace has real OCR output — sanity check on word count", () => {
    const trace = getExtractionTrace("20130183449")!;
    // A 4-page scanned deed should yield well over 100 words of OCR'd text.
    expect(totalOcrWordCount(trace)).toBeGreaterThan(100);
  });

  it("POPHAM trace recovered the trust name", () => {
    const trace = getExtractionTrace("20130183449")!;
    const trustField = trace.extractions.find((e) => e.field === "trust_name");
    expect(trustField).toBeDefined();
    expect(trustField!.value).toContain("MADISON");
    expect(trustField!.value).toContain("TRUST");
    expect(trustField!.confidence).toBeGreaterThan(0.5);
  });

  it("POPHAM trace recovered the legal description with a Lot/Book/Page anchor", () => {
    const trace = getExtractionTrace("20130183449")!;
    const legal = trace.extractions.find((e) => e.field === "legal_description");
    expect(legal).toBeDefined();
    expect(legal!.value).toMatch(/SEVILLE PARCEL 3/i);
    expect(legal!.value).toMatch(/Book\s*554/i);
    expect(legal!.value).toMatch(/Page\s*19/i);
  });

  it("POPHAM trace recovered an escrow number in normalized form", () => {
    const trace = getExtractionTrace("20130183449")!;
    const escrow = trace.extractions.find((e) => e.field === "escrow_number");
    expect(escrow).toBeDefined();
    // Hyphen-normalized: no spaces between segments.
    expect(escrow!.value).toMatch(/^[A-Z0-9][A-Z0-9\-]+$/);
    // POPHAM's specific escrow id.
    expect(escrow!.value).toContain("00044857");
  });

  it("hasExtractionTrace returns false for instruments without a trace", () => {
    expect(hasExtractionTrace("20210057847")).toBe(false);
    expect(hasExtractionTrace("does-not-exist")).toBe(false);
  });

  it("getExtractionTrace returns null for unknown instruments (UI graceful path)", () => {
    expect(getExtractionTrace("99999999999")).toBeNull();
  });

  it("HOGUE 2015 stretch trace exists and skipped trust_name correctly", () => {
    const trace = getExtractionTrace("20150516729");
    expect(trace).not.toBeNull();
    // HOGUE deed is not a trust conveyance — trust_name must be null,
    // NOT a fabricated value.
    const trustField = trace!.extractions.find((e) => e.field === "trust_name");
    expect(trustField).toBeDefined();
    expect(trustField!.value).toBeNull();
  });

  it("every extraction field includes an extraction_method (audit trail)", () => {
    const trace = getExtractionTrace("20130183449")!;
    for (const e of trace.extractions) {
      expect(e.extraction_method).toBeTruthy();
      expect(e.extraction_method.length).toBeGreaterThan(5);
    }
  });
});
