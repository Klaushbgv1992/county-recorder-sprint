import { describe, expect, it } from "vitest";
import { buildCandidateRows } from "./release-candidate-matcher";
import { loadParcelDataByApn } from "../data-loader";

describe("ANGUS lc-007 (matcher-empty-state, Branch D)", () => {
  it("renders empty-state moat note when no release in corpus", () => {
    const data = loadParcelDataByApn("304-78-367");
    const dot = data.instruments.find((i) => i.instrument_number === "20200620457")!;
    const pool = data.instruments.filter(
      (i) =>
        i.document_type === "full_reconveyance" ||
        i.document_type === "partial_reconveyance",
    );
    const result = buildCandidateRows({
      lifecycleId: "lc-007",
      dot,
      pool,
      releaseLinks: [],
      lifecycles: data.lifecycles,
      candidateActions: {},
    });
    expect(result.total).toBe(0);
    expect(result.rows).toEqual([]);
    expect(result.aboveThresholdCount).toBe(0);
  });
});
