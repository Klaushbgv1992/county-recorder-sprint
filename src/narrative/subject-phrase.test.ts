// src/narrative/subject-phrase.test.ts
import { describe, it, expect } from "vitest";
import { subjectPhraseFromParties, isEntityName, cleanEntityName } from "./subject-phrase";
import type { Party } from "../types";

function grantees(...names: string[]): Party[] {
  return names.map((name) => ({
    name,
    role: "grantee" as const,
    provenance: "manual_entry" as const,
    confidence: 0.9,
  }));
}

describe("isEntityName", () => {
  it("detects LLC, L.L.C., INC, CORP, CORPORATION, CO, L.P., LP, LLP, COMPANY, PARTNERSHIP, ESTATE, TRUST", () => {
    expect(isEntityName("ABC PROPERTIES LLC")).toBe(true);
    expect(isEntityName("Acme, L.L.C.")).toBe(true);
    expect(isEntityName("WIDGET INC")).toBe(true);
    expect(isEntityName("WIDGET INC.")).toBe(true);
    expect(isEntityName("BIG CORP")).toBe(true);
    expect(isEntityName("Big Corporation")).toBe(true);
    expect(isEntityName("Foo Co.")).toBe(true);
    expect(isEntityName("Foo, L.P.")).toBe(true);
    expect(isEntityName("Foo LP")).toBe(true);
    expect(isEntityName("Foo LLP")).toBe(true);
    expect(isEntityName("Foo Company")).toBe(true);
    expect(isEntityName("Foo Partnership")).toBe(true);
    expect(isEntityName("ESTATE OF JANE DOE")).toBe(true);
    expect(isEntityName("THE MADISON LIVING TRUST")).toBe(true);
    expect(isEntityName("THE BRIAN J. AND TANYA R. MADISON LIVING TRUST, dated February 23, 2006")).toBe(true);
  });

  it("does not flag individuals", () => {
    expect(isEntityName("POPHAM CHRISTOPHER")).toBe(false);
    expect(isEntityName("HOGUE JASON")).toBe(false);
    expect(isEntityName("JOHN SMITH")).toBe(false);
  });
});

describe("cleanEntityName", () => {
  it("title-cases ALL-CAPS entity names while preserving common acronyms", () => {
    expect(cleanEntityName("ABC PROPERTIES LLC")).toBe("Abc Properties LLC");
    expect(cleanEntityName("THE MADISON LIVING TRUST")).toBe("The Madison Living Trust");
    expect(cleanEntityName("WIDGET INC.")).toBe("Widget Inc.");
    expect(cleanEntityName("JPMORGAN CHASE BANK, N.A.")).toBe("JPMorgan Chase Bank, N.A.");
  });

  it("strips trailing ', dated <date>' on trust names", () => {
    expect(cleanEntityName("THE BRIAN J. AND TANYA R. MADISON LIVING TRUST, dated February 23, 2006"))
      .toBe("The Brian J. and Tanya R. Madison Living Trust");
  });

  it("leaves an already-clean mixed-case name alone", () => {
    expect(cleanEntityName("The Smith Family Trust")).toBe("The Smith Family Trust");
  });
});

describe("subjectPhraseFromParties (grantees)", () => {
  // Curated parties data uses FIRSTNAME LASTNAME format (e.g. "CHRISTOPHER POPHAM").
  // The raw Maricopa API uses LASTNAME FIRST, but subjectPhraseFromParties operates
  // on the curated parties array, not the raw API names array.
  it("two individuals with same last name → 'the Pophams'", () => {
    expect(subjectPhraseFromParties(grantees("CHRISTOPHER POPHAM", "ASHLEY POPHAM"), "grantee"))
      .toBe("the Pophams");
  });

  it("one individual → 'Christopher Popham'", () => {
    expect(subjectPhraseFromParties(grantees("CHRISTOPHER POPHAM"), "grantee"))
      .toBe("Christopher Popham");
  });

  it("two individuals with different last names → 'Smith & Jones' (no plural)", () => {
    expect(subjectPhraseFromParties(grantees("JOHN SMITH", "MARY JONES"), "grantee"))
      .toBe("John Smith and Mary Jones");
  });

  it("single LLC grantee → clean entity name, no plural, no article", () => {
    expect(subjectPhraseFromParties(grantees("ABC PROPERTIES LLC"), "grantee"))
      .toBe("Abc Properties LLC");
  });

  it("single trust grantee → clean name without 'the ___s' wrap, no trailing date tail", () => {
    expect(subjectPhraseFromParties(
      grantees("THE BRIAN J. AND TANYA R. MADISON LIVING TRUST, dated February 23, 2006"),
      "grantee",
    )).toBe("The Brian J. and Tanya R. Madison Living Trust");
  });

  it("mixed individual + entity → comma-joined with proper casing", () => {
    expect(subjectPhraseFromParties(
      grantees("JOHN SMITH", "ABC PROPERTIES LLC"),
      "grantee",
    )).toBe("John Smith and Abc Properties LLC");
  });

  it("empty → 'the current owners' fallback for homeowner copy", () => {
    expect(subjectPhraseFromParties([], "grantee")).toBe("the current owners");
  });

  it("filters to the requested role", () => {
    const parties: Party[] = [
      { name: "ONE SELLER", role: "grantor", provenance: "manual_entry", confidence: 0.9 },
      { name: "CHRISTOPHER POPHAM", role: "grantee", provenance: "manual_entry", confidence: 0.9 },
      { name: "ASHLEY POPHAM", role: "grantee", provenance: "manual_entry", confidence: 0.9 },
    ];
    expect(subjectPhraseFromParties(parties, "grantee")).toBe("the Pophams");
    expect(subjectPhraseFromParties(parties, "grantor")).toBe("One Seller");
  });
});
