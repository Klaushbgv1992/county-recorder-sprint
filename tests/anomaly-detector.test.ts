import { describe, it, expect } from "vitest";
import { detectAnomalies } from "../src/logic/anomaly-detector";

const NOW = new Date("2026-04-14T00:00:00Z");

describe("detectAnomalies", () => {
  it("composes all rules for POPHAM and returns findings sorted by severity then rule id", () => {
    const findings = detectAnomalies("304-78-386", NOW);
    const ruleIds = findings.map((f) => f.rule_id);
    expect(ruleIds).toEqual(expect.arrayContaining(["R1", "R3", "R4", "R5", "R6", "R7"]));
    expect(ruleIds).not.toContain("R2"); // POPHAM 2021 DOT only 5.2y old
    expect(ruleIds).not.toContain("R8"); // POPHAM within 7y
    // severity ordering: all POPHAM findings are medium/info, so medium should come first
    const severities = findings.map((f) => f.severity);
    const order = { high: 0, medium: 1, low: 2, info: 3 };
    for (let i = 1; i < severities.length; i++) {
      expect(order[severities[i - 1]]).toBeLessThanOrEqual(order[severities[i]]);
    }
  });

  it("composes all rules for HOGUE", () => {
    const findings = detectAnomalies("304-77-689", NOW);
    const ruleIds = findings.map((f) => f.rule_id);
    expect(ruleIds).toContain("R2");
    expect(ruleIds).toContain("R8");
    expect(ruleIds).toContain("R7");
    expect(ruleIds).toContain("R1"); // 2015-07-17 same-day pair
  });

  it("returns [] for an APN not in the corpus", () => {
    expect(detectAnomalies("999-99-999", NOW)).toEqual([]);
  });
});
