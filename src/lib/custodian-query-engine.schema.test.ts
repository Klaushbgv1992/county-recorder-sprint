import { describe, it, expect } from "vitest";
import { FixtureSchema, type Fixture } from "./custodian-query-engine.schema";
import fixture from "../data/custodian-sweep-fixture.json";

const MINIMAL: Fixture = {
  schema_version: 1,
  captured_at: "2026-04-18T19:32:00Z",
  capture_duration_ms: 9120000,
  parties: ["A", "B", "C", "D", "E"],
  live_indexes: [
    { id: "mcr-name",   name: "MCR",  short: "MCR",  custodian: "County", coverage: "1871-2026" },
    { id: "mcsc-civil", name: "MCSC", short: "MCSC", custodian: "Court",  coverage: "1990-2026" },
  ],
  dead_ends: [
    { id: "az-dor-liens", name: "AZ DOR",      reason: "r" },
    { id: "irs-nftl",     name: "IRS NFTL",    reason: "r" },
    { id: "usbc-az",      name: "USBC AZ",     reason: "r" },
  ],
  cells: {
    "A__mcr-name__public-api":      { status: "blocked", failure: { kind: "http_403", message: "403" } },
    "A__mcr-name__county-internal": { status: "zero" },
  },
  parcel_sweeps: {
    "304-78-386": {
      apn: "304-78-386",
      status: "swept",
      parties: ["A"],
      indexes: ["mcr-name"],
      hits: [],
      verified_through: "2026-04-18",
      swept_at: "2026-04-18T19:32:00Z",
      summary: {
        parties_scanned: 1, indexes_scanned: 1, raw_hits: 0,
        post_judgment_hits_requiring_action: 0,
        all_clear: true, all_clear_after_judgment: true, note: "ok",
      },
    },
    "304-77-689": {
      apn: "304-77-689",
      status: "no_capture_available",
      parties: ["J", "M"],
      reason: "r",
      what_production_would_do: "w",
    },
  },
};

describe("FixtureSchema", () => {
  it("accepts a minimal well-formed fixture", () => {
    expect(() => FixtureSchema.parse(MINIMAL)).not.toThrow();
  });

  it("rejects a fixture with an invalid FailureMode.kind", () => {
    const bad = structuredClone(MINIMAL);
    // @ts-expect-error intentional invalid kind
    bad.cells["A__mcr-name__public-api"].failure.kind = "not_a_real_kind";
    expect(() => FixtureSchema.parse(bad)).toThrow();
  });

  it("rejects a fixture with hit.confidence out of [0,1]", () => {
    const bad = structuredClone(MINIMAL);
    bad.cells["A__mcr-name__county-internal"] = {
      status: "hit",
      hits: [{
        id: "h1", party_name: "A", summary: "s",
        ai_judgment: "probable_false_positive", ai_rationale: "r",
        confidence: 1.5,
        provenance: "county_internal_index", action_required: "none",
      }],
    };
    expect(() => FixtureSchema.parse(bad)).toThrow();
  });

  it("dev-seed fixture passes schema", () => {
    expect(() => FixtureSchema.parse(fixture)).not.toThrow();
  });
});
