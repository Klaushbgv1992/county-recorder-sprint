import { describe, it, expect } from "vitest";
import { generateScheduleBI, type GenerateInput } from "./schedule-bi-generator";
import { loadParcelDataByApn } from "../data-loader";
import { detectAnomalies } from "./anomaly-detector";
import type { TransactionInputs } from "../types/commitment";

const POPHAM_APN = "304-78-386";
const SILVA_APN = "304-77-566";

function makeInput(apn: string, inputs: TransactionInputs): GenerateInput {
  const data = loadParcelDataByApn(apn);
  return {
    apn,
    lifecycles: data.lifecycles,
    anomalies: detectAnomalies(apn),
    instruments: data.instruments,
    parcel: data.parcel,
    inputs,
    verifiedThrough: data.pipelineStatus.verified_through_date,
  };
}

describe("generateScheduleBI per transaction type", () => {
  describe("purchase (POPHAM)", () => {
    const input = makeInput(POPHAM_APN, {
      transaction_type: "purchase",
      effective_date: "2026-05-01",
      buyers: "SMITH JOHN",
      sellers: "POPHAM CHRISTOPHER / ASHLEY",
      sale_price: "450000",
      new_lender: "First National Bank",
      loan_amount: "360000",
    });

    it("emits payoff, warranty deed, new DOT, tax cert, HOA estoppel, and bring-down", () => {
      const items = generateScheduleBI(input);
      const templateIds = items.map((i) => i.template_id);
      expect(templateIds).toContain("BI-PAYOFF-OPEN-DOT");
      expect(templateIds).toContain("BI-RECORD-WARRANTY-DEED");
      expect(templateIds).toContain("BI-RECORD-NEW-DOT");
      expect(templateIds).toContain("BI-TAX-CERT");
      expect(templateIds).toContain("BI-HOA-ESTOPPEL");
      expect(templateIds).toContain("BI-BRING-DOWN-SEARCH");
    });

    it("does NOT emit subordination or seller-authority-trust (POPHAM is individuals)", () => {
      const items = generateScheduleBI(input);
      const templateIds = items.map((i) => i.template_id);
      expect(templateIds).not.toContain("BI-SUBORDINATION");
      expect(templateIds).not.toContain("BI-SELLER-AUTHORITY-TRUST");
    });
  });

  describe("refinance (POPHAM)", () => {
    const input = makeInput(POPHAM_APN, {
      transaction_type: "refinance",
      effective_date: "2026-05-01",
      borrower: "POPHAM CHRISTOPHER / ASHLEY",
      new_lender: "Better Mortgage",
      new_loan_amount: "300000",
      existing_dot_lifecycle_id: "lc-002",
    });

    it("emits payoff-specific-dot, new DOT, tax cert, bring-down, NO warranty deed", () => {
      const items = generateScheduleBI(input);
      const templateIds = items.map((i) => i.template_id);
      expect(templateIds).toContain("BI-PAYOFF-SPECIFIC-DOT");
      expect(templateIds).toContain("BI-RECORD-NEW-DOT");
      expect(templateIds).toContain("BI-TAX-CERT");
      expect(templateIds).toContain("BI-BRING-DOWN-SEARCH");
      expect(templateIds).not.toContain("BI-RECORD-WARRANTY-DEED");
    });

    it("cites the specific DOT recording number 20210057847", () => {
      const items = generateScheduleBI(input);
      const payoff = items.find((i) => i.template_id === "BI-PAYOFF-SPECIFIC-DOT");
      expect(payoff).toBeDefined();
      expect(payoff!.text).toContain("20210057847");
      expect(payoff!.origin_lifecycle_id).toBe("lc-002");
    });
  });

  describe("cash_sale (POPHAM)", () => {
    const input = makeInput(POPHAM_APN, {
      transaction_type: "cash_sale",
      effective_date: "2026-05-01",
      buyers: "JONES MARY",
      sellers: "POPHAM CHRISTOPHER / ASHLEY",
      sale_price: "500000",
    });

    it("emits payoff, warranty deed, tax cert, bring-down, NO new DOT", () => {
      const items = generateScheduleBI(input);
      const templateIds = items.map((i) => i.template_id);
      expect(templateIds).toContain("BI-PAYOFF-OPEN-DOT");
      expect(templateIds).toContain("BI-RECORD-WARRANTY-DEED");
      expect(templateIds).toContain("BI-TAX-CERT");
      expect(templateIds).toContain("BI-BRING-DOWN-SEARCH");
      expect(templateIds).not.toContain("BI-RECORD-NEW-DOT");
    });
  });

  describe("second_dot (POPHAM)", () => {
    const input = makeInput(POPHAM_APN, {
      transaction_type: "second_dot",
      effective_date: "2026-05-01",
      borrower: "POPHAM CHRISTOPHER / ASHLEY",
      new_lender: "Home Equity Partners",
      loan_amount: "75000",
      first_position_lifecycle_id: "lc-002",
    });

    it("emits new DOT, verify-first-position, tax cert, bring-down, NO deed/payoff", () => {
      const items = generateScheduleBI(input);
      const templateIds = items.map((i) => i.template_id);
      expect(templateIds).toContain("BI-RECORD-NEW-DOT");
      expect(templateIds).toContain("BI-VERIFY-FIRST-POSITION");
      expect(templateIds).toContain("BI-TAX-CERT");
      expect(templateIds).toContain("BI-BRING-DOWN-SEARCH");
      expect(templateIds).not.toContain("BI-RECORD-WARRANTY-DEED");
      expect(templateIds).not.toContain("BI-PAYOFF-OPEN-DOT");
      expect(templateIds).not.toContain("BI-PAYOFF-SPECIFIC-DOT");
    });
  });

  describe("heloc (POPHAM)", () => {
    it("emits new DOT, verify-first-position, tax cert, bring-down", () => {
      const input = makeInput(POPHAM_APN, {
        transaction_type: "heloc",
        effective_date: "2026-05-01",
        borrower: "POPHAM CHRISTOPHER / ASHLEY",
        new_lender: "Credit Union One",
        credit_limit: "100000",
        first_position_lifecycle_id: "lc-002",
        existing_heloc_lifecycle_id: null,
      });
      const items = generateScheduleBI(input);
      const templateIds = items.map((i) => i.template_id);
      expect(templateIds).toContain("BI-RECORD-NEW-DOT");
      expect(templateIds).toContain("BI-VERIFY-FIRST-POSITION");
      expect(templateIds).toContain("BI-TAX-CERT");
      expect(templateIds).toContain("BI-BRING-DOWN-SEARCH");
      expect(templateIds).not.toContain("BI-RECORD-WARRANTY-DEED");
      expect(templateIds).not.toContain("BI-PAYOFF-OPEN-DOT");
    });
  });

  describe("purchase with trust-vested seller (SILVA 304-77-566)", () => {
    it("emits seller-authority-trust item citing MOORE REVOCABLE TRUST", () => {
      const input = makeInput(SILVA_APN, {
        transaction_type: "purchase",
        effective_date: "2026-05-01",
        buyers: "WILLIAMS ROBERT",
        sellers: "MOORE REVOCABLE TRUST",
        sale_price: "380000",
        new_lender: "Wells Fargo",
        loan_amount: "304000",
      });
      const items = generateScheduleBI(input);
      const trustItem = items.find((i) => i.template_id === "BI-SELLER-AUTHORITY-TRUST");
      expect(trustItem).toBeDefined();
      expect(trustItem!.text).toContain("MOORE REVOCABLE TRUST");
    });
  });

  describe("item count differentiation", () => {
    it("purchase produces more items than refinance on the same parcel", () => {
      const purchaseItems = generateScheduleBI(makeInput(POPHAM_APN, {
        transaction_type: "purchase",
        effective_date: "2026-05-01",
        buyers: "SMITH JOHN",
        sellers: "POPHAM CHRISTOPHER / ASHLEY",
        sale_price: "450000",
        new_lender: "First National Bank",
        loan_amount: "360000",
      }));
      const refiItems = generateScheduleBI(makeInput(POPHAM_APN, {
        transaction_type: "refinance",
        effective_date: "2026-05-01",
        borrower: "POPHAM CHRISTOPHER / ASHLEY",
        new_lender: "Better Mortgage",
        new_loan_amount: "300000",
        existing_dot_lifecycle_id: "lc-002",
      }));
      expect(purchaseItems.length).toBeGreaterThan(refiItems.length);
    });
  });
});
