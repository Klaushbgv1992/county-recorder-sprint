import { describe, it, expect } from "vitest";
import { translate } from "../src/terminology/glossary";

describe("translate", () => {
  it("returns plain-English equivalent for a known term", () => {
    expect(translate("Deed of Trust")).toBe("Mortgage");
  });

  it("is case-insensitive", () => {
    expect(translate("deed of trust")).toBe("Mortgage");
    expect(translate("DEED OF TRUST")).toBe("Mortgage");
  });

  it("returns the original string for unknown terms", () => {
    expect(translate("Unknown Thing")).toBe("Unknown Thing");
  });

  it("translates all 16 glossary entries", () => {
    const entries: [string, string][] = [
      ["Chain of Title", "Ownership History"],
      ["Encumbrances", "Claims Against Property"],
      ["Encumbrance Lifecycles", "Claims Against Property"],
      ["Deed of Trust", "Mortgage"],
      ["Full Reconveyance", "Mortgage Paid Off"],
      ["Partial Reconveyance", "Partial Payoff"],
      ["Warranty Deed", "Sale Deed"],
      ["Special Warranty Deed", "Sale Deed (Limited)"],
      ["Quit Claim Deed", "Ownership Transfer"],
      ["Grant Deed", "Sale Deed"],
      ["Grantor", "Previous Owner"],
      ["Grantee", "New Owner"],
      ["DOT", "Mortgage"],
      ["Assignment of DOT", "Mortgage Transfer"],
      ["HELOC DOT", "Home Equity Loan"],
      ["Trustor/Borrower", "Borrower"],
    ];
    for (const [pro, plain] of entries) {
      expect(translate(pro)).toBe(plain);
    }
  });
});
