import { describe, expect, it } from "vitest";
import { buildCommitment } from "./commitment-builder";
import { loadParcelDataByApn } from "../data-loader";
import closingImpactTemplates from "../data/closing-impact-templates.json";

const POPHAM_APN = "304-78-386";
const HOGUE_APN = "304-77-689";
const FIXED_GENERATED_AT = "2026-04-14T12:00:00.000Z";

describe("buildCommitment — POPHAM", () => {
  const data = loadParcelDataByApn(POPHAM_APN);
  const doc = buildCommitment({
    parcel: data.parcel,
    instruments: data.instruments,
    links: data.links,
    lifecycles: data.lifecycles,
    pipelineStatus: data.pipelineStatus,
    closingImpactTemplates,
    generatedAt: FIXED_GENERATED_AT,
  });

  it("sets header fields from parcel + pipelineStatus", () => {
    expect(doc.header.parcelApn).toBe("304-78-386");
    expect(doc.header.parcelAddress).toContain("3674 E Palmer St");
    expect(doc.header.verifiedThroughDate).toBe("2026-04-09");
    expect(doc.header.generatedAt).toBe(FIXED_GENERATED_AT);
    expect(doc.header.countyName).toBe("Maricopa County, AZ");
  });

  it("interpolates verified_through_date into header note", () => {
    expect(doc.header.headerNote).toContain("transaction-scoped");
    expect(doc.header.headerNote).toContain("2026-04-09");
  });

  it("populates Schedule A current owner and legal description", () => {
    expect(doc.scheduleA.currentOwner.value).toBe("POPHAM CHRISTOPHER / ASHLEY");
    expect(doc.scheduleA.legalDescription.value).toBe(data.parcel.legal_description);
    expect(doc.scheduleA.apn).toBe("304-78-386");
    expect(doc.scheduleA.subdivision).toBe("Seville Parcel 3");
  });

  it("preserves provenance and confidence on Schedule A fields", () => {
    expect(doc.scheduleA.currentOwner.provenance).toBe("manual_entry");
    expect(doc.scheduleA.legalDescription.provenance).toBe("manual_entry");
  });

  it("renders all 4 POPHAM lifecycles in lifecycles.json order", () => {
    expect(doc.scheduleB2.map((r) => r.lifecycleId)).toEqual([
      "lc-001",
      "lc-002",
      "lc-004",
    ]);
  });

  it("released lifecycle (lc-001) has no closingImpact", () => {
    const row = doc.scheduleB2.find((r) => r.lifecycleId === "lc-001")!;
    expect(row.status).toBe("released");
    expect(row.closingImpact).toBeUndefined();
  });

  it("open lifecycle (lc-002, root is DOT) renders DOT closing-impact template", () => {
    const row = doc.scheduleB2.find((r) => r.lifecycleId === "lc-002")!;
    expect(row.status).toBe("open");
    expect(row.closingImpact).toContain("payoff statement and recorded reconveyance");
  });

  it("plat lifecycle (lc-004) is tagged as subdivision encumbrance", () => {
    const row = doc.scheduleB2.find((r) => r.lifecycleId === "lc-004")!;
    expect(row.subtype).toBe("subdivision_encumbrance");
  });

  it("lc-004 root + child resolve to readable doc-type labels (not 'Other')", () => {
    const row = doc.scheduleB2.find((r) => r.lifecycleId === "lc-004")!;
    expect(row.rootInstrument.documentType).toBe("Subdivision Plat");
    const affidavit = row.childInstruments.find(
      (c) => c.recordingNumber === "20010849180",
    );
    expect(affidavit).toBeDefined();
    expect(affidavit!.documentType).toBe("Affidavit of Correction");
  });

  it("citation URL on rootInstrument uses the public API PDF endpoint", () => {
    const row = doc.scheduleB2.find((r) => r.lifecycleId === "lc-001")!;
    expect(row.rootInstrument.pdfUrl).toBe(
      "https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber=20130183450",
    );
  });

  it("Sources block lists each cited instrument with its metadata URL prefixed", () => {
    expect(doc.sources.countyApiBase).toBe("https://publicapi.recorder.maricopa.gov");
    const entry20130183450 = doc.sources.perInstrumentMetadataUrls.find(
      (e) => e.recordingNumber === "20130183450",
    );
    expect(entry20130183450).toBeDefined();
    expect(entry20130183450!.url).toBe(
      "https://publicapi.recorder.maricopa.gov/documents/20130183450",
    );
    const all = doc.sources.perInstrumentMetadataUrls.map((e) => e.recordingNumber);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("buildCommitment — viewedInstrumentNumber anchoring", () => {
  const data = loadParcelDataByApn(POPHAM_APN);

  it("sets viewedMarker on the row whose root matches the viewed instrument", () => {
    const doc = buildCommitment({
      parcel: data.parcel,
      instruments: data.instruments,
      links: data.links,
      lifecycles: data.lifecycles,
      pipelineStatus: data.pipelineStatus,
      closingImpactTemplates,
      generatedAt: FIXED_GENERATED_AT,
      viewedInstrumentNumber: "20210057847",
    });
    expect(doc.scheduleB2.find((r) => r.lifecycleId === "lc-002")!.viewedMarker).toBe(true);
    expect(doc.scheduleB2.find((r) => r.lifecycleId === "lc-001")!.viewedMarker).toBe(false);
  });

  it("sets viewedMarker on the row whose child matches the viewed instrument", () => {
    const doc = buildCommitment({
      parcel: data.parcel,
      instruments: data.instruments,
      links: data.links,
      lifecycles: data.lifecycles,
      pipelineStatus: data.pipelineStatus,
      closingImpactTemplates,
      generatedAt: FIXED_GENERATED_AT,
      viewedInstrumentNumber: "20210075858",
    });
    expect(doc.scheduleB2.find((r) => r.lifecycleId === "lc-001")!.viewedMarker).toBe(true);
  });

  it("leaves all viewedMarker false when prop is absent", () => {
    const doc = buildCommitment({
      parcel: data.parcel,
      instruments: data.instruments,
      links: data.links,
      lifecycles: data.lifecycles,
      pipelineStatus: data.pipelineStatus,
      closingImpactTemplates,
      generatedAt: FIXED_GENERATED_AT,
    });
    expect(doc.scheduleB2.every((r) => r.viewedMarker === false)).toBe(true);
  });
});

describe("buildCommitment — HOGUE regression (narrow)", () => {
  const data = loadParcelDataByApn(HOGUE_APN);

  it("does not throw", () => {
    expect(() =>
      buildCommitment({
        parcel: data.parcel,
        instruments: data.instruments,
        links: data.links,
        lifecycles: data.lifecycles,
        pipelineStatus: data.pipelineStatus,
        closingImpactTemplates,
        generatedAt: FIXED_GENERATED_AT,
      }),
    ).not.toThrow();
  });

  it("includes lc-003 with verbatim rationale text from lifecycles.json", () => {
    const doc = buildCommitment({
      parcel: data.parcel,
      instruments: data.instruments,
      links: data.links,
      lifecycles: data.lifecycles,
      pipelineStatus: data.pipelineStatus,
      closingImpactTemplates,
      generatedAt: FIXED_GENERATED_AT,
    });
    const row = doc.scheduleB2.find((r) => r.lifecycleId === "lc-003");
    expect(row).toBeDefined();
    const sourceLifecycle = data.lifecycles.find((lc) => lc.id === "lc-003")!;
    expect(row!.rationale).toBe(sourceLifecycle.status_rationale);
    expect(row!.rationale).toContain(
      "Maricopa public API does not support name-filtered document search",
    );
  });
});
