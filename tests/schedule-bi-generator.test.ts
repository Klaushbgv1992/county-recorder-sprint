import { describe, it, expect } from "vitest";
import { generateScheduleBI } from "../src/logic/schedule-bi-generator";
import { loadParcelDataByApn } from "../src/data-loader";
import { detectAnomalies } from "../src/logic/anomaly-detector";
import type {
  Parcel,
  Instrument,
  EncumbranceLifecycle,
} from "../src/types";
import type { TransactionInputs } from "../src/types/commitment";

const NOW = new Date("2026-04-14T00:00:00Z");

const INPUTS: TransactionInputs = {
  transaction_type: "refinance",
  effective_date: "2026-05-01",
  buyer_or_borrower: "POPHAM CHRISTOPHER / ASHLEY",
  new_lender: "ACME BANK, N.A.",
};

describe("generateScheduleBI", () => {
  it("emits a payoff item for each open DOT-rooted lifecycle (HOGUE lc-003)", () => {
    const { parcel, instruments, lifecycles } = loadParcelDataByApn("304-77-689");
    const anomalies = detectAnomalies("304-77-689", NOW);
    const items = generateScheduleBI({
      apn: "304-77-689",
      lifecycles,
      anomalies,
      instruments,
      parcel,
      inputs: INPUTS,
    });

    const payoffs = items.filter((i) => i.template_id === "BI-PAYOFF-OPEN-DOT");
    expect(payoffs.length).toBe(1);
    const payoff = payoffs[0];
    expect(payoff.origin_lifecycle_id).toBe("lc-003");
    expect(payoff.text).toContain("20150516730");
    expect(payoff.text).toContain("lc-003");
    // HOGUE 2015 DOT has MERS nominee for Pinnacle — use the real lender.
    expect(payoff.text).toContain("PINNACLE CAPITAL MORTGAGE LLC");
  });

  it("emits two payoff items when two open DOT lifecycles exist", () => {
    const parcel: Parcel = {
      apn: "999-99-999",
      address: "x",
      city: "x",
      state: "AZ",
      zip: "00000",
      legal_description: "x",
      current_owner: "TEST OWNER",
      subdivision: "",
    };
    const instruments = [
      {
        instrument_number: "10000000001",
        recording_date: "2018-01-01",
        document_type: "deed_of_trust",
        document_type_raw: "DEED TRST",
        bundled_document_types: [],
        parties: [
          { name: "TEST OWNER", role: "trustor", provenance: "manual_entry", confidence: 1 },
          { name: "FIRST BANK", role: "beneficiary", provenance: "manual_entry", confidence: 1 },
        ],
        extracted_fields: {},
        back_references: [],
        source_image_path: "/x.pdf",
        page_count: 1,
        raw_api_response: {
          names: [],
          documentCodes: ["DEED TRST"],
          recordingDate: "1-1-2018",
          recordingNumber: "10000000001",
          pageAmount: 1,
          docketBook: 0,
          pageMap: 0,
          affidavitPresent: false,
          affidavitPageAmount: 0,
          restricted: false,
        },
        corpus_boundary_note: "test",
      },
      {
        instrument_number: "10000000002",
        recording_date: "2019-01-01",
        document_type: "deed_of_trust",
        document_type_raw: "DEED TRST",
        bundled_document_types: [],
        parties: [
          { name: "TEST OWNER", role: "trustor", provenance: "manual_entry", confidence: 1 },
          { name: "SECOND BANK", role: "beneficiary", provenance: "manual_entry", confidence: 1 },
        ],
        extracted_fields: {},
        back_references: [],
        source_image_path: "/x.pdf",
        page_count: 1,
        raw_api_response: {
          names: [],
          documentCodes: ["DEED TRST"],
          recordingDate: "1-1-2019",
          recordingNumber: "10000000002",
          pageAmount: 1,
          docketBook: 0,
          pageMap: 0,
          affidavitPresent: false,
          affidavitPageAmount: 0,
          restricted: false,
        },
        corpus_boundary_note: "test",
      },
    ] as unknown as Instrument[];
    const lifecycles = [
      {
        id: "lc-a",
        root_instrument: "10000000001",
        child_instruments: [],
        status: "open",
        status_rationale: "x",
        examiner_override: null,
      },
      {
        id: "lc-b",
        root_instrument: "10000000002",
        child_instruments: [],
        status: "open",
        status_rationale: "x",
        examiner_override: null,
      },
    ] as unknown as EncumbranceLifecycle[];

    const items = generateScheduleBI({
      apn: parcel.apn,
      lifecycles,
      anomalies: [],
      instruments,
      parcel,
      inputs: INPUTS,
    });
    const payoffs = items.filter((i) => i.template_id === "BI-PAYOFF-OPEN-DOT");
    expect(payoffs.length).toBe(2);
    expect(payoffs.map((p) => p.origin_lifecycle_id).sort()).toEqual(["lc-a", "lc-b"]);
  });

  it("emits BI-ASSIGNMENT-VERIFY when R4 fires (POPHAM)", () => {
    const { parcel, instruments, lifecycles } = loadParcelDataByApn("304-78-386");
    const anomalies = detectAnomalies("304-78-386", NOW);
    const items = generateScheduleBI({
      apn: "304-78-386",
      lifecycles,
      anomalies,
      instruments,
      parcel,
      inputs: INPUTS,
    });
    const assignItems = items.filter((i) => i.template_id === "BI-ASSIGNMENT-VERIFY");
    expect(assignItems.length).toBe(1);
    expect(assignItems[0].why).toContain("R4");
    expect(assignItems[0].origin_anomaly_id).toMatch(/^R4-304-78-386-/);
  });

  it("emits BI-TRUST-CERT when R5 fires (POPHAM grantor MADISON LIVING TRUST)", () => {
    const { parcel, instruments, lifecycles } = loadParcelDataByApn("304-78-386");
    const anomalies = detectAnomalies("304-78-386", NOW);
    const items = generateScheduleBI({
      apn: "304-78-386",
      lifecycles,
      anomalies,
      instruments,
      parcel,
      inputs: INPUTS,
    });
    const trustItems = items.filter((i) => i.template_id === "BI-TRUST-CERT");
    expect(trustItems.length).toBe(1);
    expect(trustItems[0].text).toContain("MADISON LIVING TRUST");
    expect(trustItems[0].origin_anomaly_id).toMatch(/^R5-304-78-386-/);
  });

  it("emits BI-CURATIVE-AFFIDAVIT when R3 fires (POPHAM MERS nominee)", () => {
    const { parcel, instruments, lifecycles } = loadParcelDataByApn("304-78-386");
    const anomalies = detectAnomalies("304-78-386", NOW);
    const items = generateScheduleBI({
      apn: "304-78-386",
      lifecycles,
      anomalies,
      instruments,
      parcel,
      inputs: INPUTS,
    });
    const curative = items.filter((i) => i.template_id === "BI-CURATIVE-AFFIDAVIT");
    expect(curative.length).toBe(1);
    expect(curative[0].text).toContain("POPHAM CHRISTOPHER / ASHLEY");
    expect(curative[0].origin_anomaly_id).toMatch(/^R3-304-78-386-/);
  });

  it("emits BI-HOA-ESTOPPEL when parcel.subdivision is non-empty", () => {
    const { parcel, instruments, lifecycles } = loadParcelDataByApn("304-78-386");
    const anomalies = detectAnomalies("304-78-386", NOW);
    const items = generateScheduleBI({
      apn: "304-78-386",
      lifecycles,
      anomalies,
      instruments,
      parcel,
      inputs: INPUTS,
    });
    const hoa = items.find((i) => i.template_id === "BI-HOA-ESTOPPEL");
    expect(hoa).toBeDefined();
    expect(hoa!.text).toContain("Seville Parcel 3");
    expect(hoa!.text).toContain("Seville Parcel 3 HOA");
  });

  it("omits BI-HOA-ESTOPPEL when subdivision is empty", () => {
    const parcel: Parcel = {
      apn: "000-00-000",
      address: "x",
      city: "x",
      state: "AZ",
      zip: "00000",
      legal_description: "x",
      current_owner: "TEST",
      subdivision: "",
    };
    const items = generateScheduleBI({
      apn: parcel.apn,
      lifecycles: [],
      anomalies: [],
      instruments: [],
      parcel,
      inputs: INPUTS,
    });
    expect(items.find((i) => i.template_id === "BI-HOA-ESTOPPEL")).toBeUndefined();
  });

  it("always emits BI-TAX-CERT regardless of lifecycles or anomalies", () => {
    const parcel: Parcel = {
      apn: "000-00-000",
      address: "x",
      city: "x",
      state: "AZ",
      zip: "00000",
      legal_description: "x",
      current_owner: "TEST",
      subdivision: "",
    };
    const items = generateScheduleBI({
      apn: parcel.apn,
      lifecycles: [],
      anomalies: [],
      instruments: [],
      parcel,
      inputs: INPUTS,
    });
    const tax = items.filter((i) => i.template_id === "BI-TAX-CERT");
    expect(tax.length).toBe(1);
    expect(tax[0].text).toContain("Maricopa County Treasurer");
    expect(tax[0].text).toContain("2026-05-01");
  });

  it("produces stable item_ids across re-runs with the same input", () => {
    const { parcel, instruments, lifecycles } = loadParcelDataByApn("304-78-386");
    const anomalies = detectAnomalies("304-78-386", NOW);
    const a = generateScheduleBI({
      apn: "304-78-386",
      lifecycles,
      anomalies,
      instruments,
      parcel,
      inputs: INPUTS,
    });
    const b = generateScheduleBI({
      apn: "304-78-386",
      lifecycles,
      anomalies,
      instruments,
      parcel,
      inputs: INPUTS,
    });
    expect(a.map((i) => i.item_id)).toEqual(b.map((i) => i.item_id));
    // 1-based per-template sequence numbering
    expect(a.find((i) => i.template_id === "BI-TAX-CERT")!.item_id).toBe(
      "BI-TAX-CERT-1",
    );
  });

  it("interpolates all placeholders — no {foo} tokens leak into output", () => {
    const { parcel, instruments, lifecycles } = loadParcelDataByApn("304-78-386");
    const anomalies = detectAnomalies("304-78-386", NOW);
    const items = generateScheduleBI({
      apn: "304-78-386",
      lifecycles,
      anomalies,
      instruments,
      parcel,
      inputs: INPUTS,
    });
    for (const item of items) {
      expect(item.text).not.toMatch(/\{[a-z_]+\}/);
      expect(item.why).not.toMatch(/\{[a-z_]+\}/);
    }
  });
});
