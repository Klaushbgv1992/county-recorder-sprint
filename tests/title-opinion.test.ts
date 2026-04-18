import { describe, expect, it } from "vitest";
import { buildTitleOpinion } from "../src/logic/title-opinion";
import { loadParcelDataByApn } from "../src/data-loader";
import { detectAnomalies } from "../src/logic/anomaly-detector";

describe("buildTitleOpinion — POPHAM with open NFTL", () => {
  const { parcel, instruments, lifecycles, pipelineStatus } =
    loadParcelDataByApn("304-78-386");
  const findings = detectAnomalies(parcel.apn);

  it("returns 'Unmarketable — cure required' when a high-severity finding exists", () => {
    const op = buildTitleOpinion({
      parcel,
      instruments,
      lifecycles,
      findings,
      asOfDate: pipelineStatus.verified_through_date,
    });
    expect(op.headline).toBe("Unmarketable — cure required");
    expect(op.blocking_findings).toContain("R10");
  });

  it("lists every open lifecycle (includes lc-015 NFTL)", () => {
    const op = buildTitleOpinion({
      parcel,
      instruments,
      lifecycles,
      findings,
      asOfDate: "2026-04-09",
    });
    expect(op.open_encumbrance_ids).toContain("lc-002");
    expect(op.open_encumbrance_ids).toContain("lc-015");
  });

  it("every claim badges a traceable source (lifecycle id / rule id / conclusion / provenance)", () => {
    const op = buildTitleOpinion({
      parcel,
      instruments,
      lifecycles,
      findings,
      asOfDate: "2026-04-09",
    });
    for (const claim of op.claims) {
      expect(claim.source_ref).toBeTruthy();
      expect(["lifecycle", "anomaly", "provenance", "conclusion", "chain"]).toContain(
        claim.source_kind,
      );
    }
  });

  it("produces 'Marketable' when fed-tax-lien lifecycle is cleared and no high-severity findings remain", () => {
    const clearedLifecycles = lifecycles.map((lc) =>
      lc.root_instrument === "20240100001"
        ? { ...lc, status: "released" as const }
        : lc,
    );
    // Re-detect anomalies with a fake R10 bypass: just filter out the
    // high-severity finding to isolate the branching behavior.
    const noHighs = findings.filter((f) => f.severity !== "high");
    const noOpenAfterClear = clearedLifecycles.filter((lc) => {
      const effective = lc.examiner_override ?? lc.status;
      return effective === "open";
    });
    const op = buildTitleOpinion({
      parcel,
      instruments,
      lifecycles: clearedLifecycles,
      findings: noHighs,
      asOfDate: "2026-04-09",
    });
    if (noOpenAfterClear.length === 0) {
      expect(op.headline).toBe("Marketable");
    } else {
      expect(op.headline).toBe("Marketable subject to exceptions");
    }
  });
});
