import { describe, expect, it } from "vitest";
import {
  extractBookPageCitations,
  segmentLegalDescription,
} from "../src/logic/legal-description-links";

describe("extractBookPageCitations", () => {
  it("extracts Book N of Maps, Page M pattern and resolves to a plat", () => {
    const legal =
      "Lot 46, SEVILLE PARCEL 3, according to the plat of record in the office of the County Recorder of Maricopa County, Arizona, recorded in Book 554 of Maps, Page 19";
    const citations = extractBookPageCitations(legal);
    expect(citations).toHaveLength(1);
    expect(citations[0].book).toBe("554");
    expect(citations[0].page).toBe("19");
    expect(citations[0].plat_instrument).toBe("20010093192");
  });

  it("handles the plain 'Book N Page M' variant", () => {
    const citations = extractBookPageCitations("Book 554 Page 19 of the records");
    expect(citations).toHaveLength(1);
    expect(citations[0].plat_instrument).toBe("20010093192");
  });

  it("returns unresolved=null when the book/page isn't in the plat index", () => {
    const citations = extractBookPageCitations("Book 999 Page 1");
    expect(citations).toHaveLength(1);
    expect(citations[0].plat_instrument).toBeNull();
  });

  it("finds multiple citations in one legal description", () => {
    const legal =
      "Being a resubdivision of Book 553 Page 15; recorded in Book 554 of Maps, Page 19.";
    const citations = extractBookPageCitations(legal);
    expect(citations).toHaveLength(2);
    expect(citations[0].book).toBe("553");
    expect(citations[1].book).toBe("554");
  });

  it("returns [] when no citation is present", () => {
    expect(extractBookPageCitations("Lot 46, SEVILLE PARCEL 3.")).toEqual([]);
  });
});

describe("segmentLegalDescription", () => {
  it("splits text around a citation preserving order", () => {
    const segs = segmentLegalDescription(
      "Lot 46, recorded in Book 554 of Maps, Page 19; see map.",
    );
    expect(segs).toHaveLength(3);
    expect(segs[0]).toEqual({ kind: "text", text: "Lot 46, recorded in " });
    expect(segs[1].kind).toBe("citation");
    expect(segs[2]).toEqual({ kind: "text", text: "; see map." });
  });

  it("returns a single text segment when no citation is present", () => {
    const segs = segmentLegalDescription("Lot 46, plain.");
    expect(segs).toEqual([{ kind: "text", text: "Lot 46, plain." }]);
  });
});
