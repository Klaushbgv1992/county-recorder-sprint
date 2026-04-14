import { describe, expect, it } from "vitest";
import { formatProvenanceTag } from "./format-provenance-tag";

describe("formatProvenanceTag", () => {
  it("renders public_api as (api), confidence omitted", () => {
    expect(formatProvenanceTag("public_api", 1)).toBe("(api)");
  });

  it("renders manual_entry as (manual), confidence omitted", () => {
    expect(formatProvenanceTag("manual_entry", 1)).toBe("(manual)");
  });

  it("renders ocr with 2-decimal confidence", () => {
    expect(formatProvenanceTag("ocr", 0.92)).toBe("(ocr, 0.92)");
  });

  it("pads single-decimal ocr confidence to 2 decimals", () => {
    expect(formatProvenanceTag("ocr", 0.8)).toBe("(ocr, 0.80)");
  });

  it("renders algorithmic provenance as (algo, X.XX)", () => {
    expect(formatProvenanceTag("algorithmic", 0.881)).toBe("(algo, 0.88)");
  });
});
