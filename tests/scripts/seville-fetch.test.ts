import { describe, it, expect } from "vitest";
import {
  toIsoDate,
  sleep,
  callBudget,
  normalizeDisplayFields,
} from "../../scripts/lib/seville-fetch";

describe("toIsoDate", () => {
  it("converts M-D-YYYY to YYYY-MM-DD", () => {
    expect(toIsoDate("4-3-2021")).toBe("2021-04-03");
    expect(toIsoDate("11-15-2020")).toBe("2020-11-15");
    expect(toIsoDate("1-1-2019")).toBe("2019-01-01");
  });

  it("throws on unexpected format", () => {
    expect(() => toIsoDate("2021/04/03")).toThrow();
    expect(() => toIsoDate("bad")).toThrow();
  });
});

describe("sleep", () => {
  it("returns a promise that resolves", async () => {
    await expect(sleep(0)).resolves.toBeUndefined();
  });
});

describe("callBudget", () => {
  it("allows calls up to the cap", () => {
    const b = callBudget(3);
    expect(() => b.consume()).not.toThrow();
    expect(() => b.consume()).not.toThrow();
    expect(() => b.consume()).not.toThrow();
    expect(b.used).toBe(3);
  });

  it("throws on the call that exceeds cap", () => {
    const b = callBudget(2);
    b.consume();
    b.consume();
    expect(() => b.consume()).toThrow(/HALT.*budget exceeded/i);
  });

  it("tracks used count", () => {
    const b = callBudget(10);
    b.consume();
    b.consume();
    expect(b.used).toBe(2);
  });
});

describe("normalizeDisplayFields", () => {
  it("sorts descending by date and returns recent_instruments", () => {
    const docs = [
      { recordingNumber: "20210075858", recordingDate: "3-19-2021", documentCode: "REL D/T", names: ["POPHAM CHRISTOPHER"] },
      { recordingNumber: "20130183450", recordingDate: "3-4-2013",  documentCode: "DEED TRST", names: ["POPHAM CHRISTOPHER", "MERS"] },
      { recordingNumber: "20210074235", recordingDate: "3-18-2021", documentCode: "WAR DEED", names: ["POPHAM CHRISTOPHER", "MADISON TRUST"] },
    ];
    const r = normalizeDisplayFields(docs);
    expect(r.last_recorded_date).toBe("2021-03-19");
    expect(r.last_doc_type).toBe("REL D/T");
    expect(r.recent_instruments).toHaveLength(3);
    expect(r.recent_instruments[0].recording_number).toBe("20210075858");
    expect(r.recent_instruments[0].recording_date).toBe("2021-03-19");
    expect(r.recent_instruments[1].recording_number).toBe("20210074235");
    expect(r.recent_instruments[2].recording_number).toBe("20130183450");
  });

  it("maps parties from names array", () => {
    const docs = [
      { recordingNumber: "20210075858", recordingDate: "3-19-2021", documentCode: "REL D/T", names: ["POPHAM CHRISTOPHER", "WELLS FARGO"] },
    ];
    const r = normalizeDisplayFields(docs);
    expect(r.recent_instruments[0].parties).toEqual(["POPHAM CHRISTOPHER", "WELLS FARGO"]);
  });

  it("defaults parties to [] when names is undefined", () => {
    const docs = [
      { recordingNumber: "20210075858", recordingDate: "3-19-2021", documentCode: "REL D/T" },
    ];
    const r = normalizeDisplayFields(docs);
    expect(r.recent_instruments[0].parties).toEqual([]);
  });

  it("handles 2 documents (variable-length)", () => {
    const docs = [
      { recordingNumber: "20200620456", recordingDate: "7-13-2020", documentCode: "Q/CL DEED", names: ["ANGUS SCOTT J"] },
      { recordingNumber: "20200620457", recordingDate: "7-13-2020", documentCode: "DEED TRST", names: ["ANGUS SCOTT J", "UNITED WHOLESALE MORTGAGE"] },
    ];
    const r = normalizeDisplayFields(docs);
    expect(r.last_recorded_date).toBe("2020-07-13");
    expect(r.recent_instruments).toHaveLength(2);
    expect(r.recent_instruments[0].recording_number).toBe("20200620456");
    expect(r.recent_instruments[1].recording_number).toBe("20200620457");
  });
});
