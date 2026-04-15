import { describe, it, expect } from "vitest";
import { provenanceLabel, provenanceInlineTag } from "../src/logic/provenance-vocab";

describe("provenance-vocab", () => {
  it("UI badge labels are human-readable", () => {
    expect(provenanceLabel("public_api")).toBe("County API");
    expect(provenanceLabel("ocr")).toBe("OCR");
    expect(provenanceLabel("manual_entry")).toBe("Curator");
    expect(provenanceLabel("algorithmic")).toBe("Inferred");
  });

  it("PDF inline tag delegates to formatProvenanceTag (smoke)", () => {
    // confirms the delegation exists — detailed formatting tested in format-provenance-tag.test.ts
    expect(provenanceInlineTag("ocr", 0.92)).toBe("(ocr, 0.92)");
  });

  it("rejects unknown provenance values", () => {
    // @ts-expect-error — unknown value must not be accepted by the type
    expect(() => provenanceLabel("unknown_value")).toThrow("Unknown ProvenanceKind");
  });
});
