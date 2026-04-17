import type { Pattern, InstrumentGroup, PatternContext } from "./types";
import type { Instrument } from "../types";
import subdivisionPlatsRaw from "../data/subdivision-plats.json";

interface SubdivisionPlatFeature {
  properties: {
    plat_instrument: string;
    display_name: string;
    plat_book: string;
    plat_page: string;
    dedicated_by: string;
    dedication_date: string;
  };
}

const PLAT_INSTRUMENTS: Record<string, SubdivisionPlatFeature["properties"]> = {};
for (const f of (subdivisionPlatsRaw as { features: SubdivisionPlatFeature[] })
  .features) {
  PLAT_INSTRUMENTS[f.properties.plat_instrument] = f.properties;
}

function year(date: string): string {
  return date.slice(0, 4);
}

function isTrustEntity(name: string): boolean {
  return /\b(TRUST|LIVING TRUST|FAMILY TRUST|REVOCABLE TRUST)\b/i.test(name);
}

function grantorNames(inst: Instrument): string[] {
  return inst.parties.filter((p) => p.role === "grantor").map((p) => p.name);
}

function granteeNames(inst: Instrument): string[] {
  return inst.parties.filter((p) => p.role === "grantee").map((p) => p.name);
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function lastNameOf(fullName: string): string {
  if (isTrustEntity(fullName)) return fullName;
  const parts = fullName.trim().split(/\s+/);
  return titleCase(parts[parts.length - 1] ?? fullName);
}

function grantorsPhrase(inst: Instrument): string {
  return grantorNames(inst).map(titleCase).join(" and ");
}

function granteesPhrase(inst: Instrument): string {
  const names = granteeNames(inst);
  if (names.length === 2)
    return `${titleCase(names[0])} and ${titleCase(names[1])}`;
  return names.map(titleCase).join(", ");
}

function granteeFamilyPhrase(inst: Instrument): string {
  const lastNames = Array.from(new Set(granteeNames(inst).map(lastNameOf)));
  if (lastNames.length === 1) return `the ${lastNames[0]}s`;
  return granteesPhrase(inst);
}

function isDeed(i: Instrument): boolean {
  return (
    i.document_type === "warranty_deed" ||
    i.document_type === "special_warranty_deed" ||
    i.document_type === "quit_claim_deed" ||
    i.document_type === "grant_deed"
  );
}

function lenderName(inst: Instrument): string {
  const lender = inst.parties.find((p) => p.role === "lender");
  if (lender) return titleCase(lender.name);
  // MERS-as-nominee edge case: unwrap to real lender if available
  const beneficiary = inst.parties.find((p) => p.role === "beneficiary");
  if (beneficiary?.nominee_for) return titleCase(beneficiary.nominee_for.party_name);
  if (beneficiary) return titleCase(beneficiary.name);
  return "a lender";
}

function isDOT(i: Instrument): boolean {
  return i.document_type === "deed_of_trust";
}

const subdivision_plat: Pattern = {
  id: "subdivision_plat",
  match: (g) =>
    g.instruments.some((i) => PLAT_INSTRUMENTS[i.instrument_number] !== undefined),
  render: (g) => {
    const inst = g.instruments.find(
      (i) => PLAT_INSTRUMENTS[i.instrument_number] !== undefined
    )!;
    const meta = PLAT_INSTRUMENTS[inst.instrument_number];
    return `Your lot was first platted as part of ${meta.display_name}, a subdivision recorded ${meta.dedication_date} by ${titleCase(meta.dedicated_by)}.`;
  },
};

const affidavit_of_correction: Pattern = {
  id: "affidavit_of_correction",
  match: (g) =>
    g.instruments.some((i) =>
      i.back_references.some((ref) => PLAT_INSTRUMENTS[ref] !== undefined)
    ),
  render: (g) => {
    const inst = g.instruments.find((i) =>
      i.back_references.some((ref) => PLAT_INSTRUMENTS[ref] !== undefined)
    )!;
    return `The plat was later corrected by an affidavit recorded ${inst.recording_date} — this fixed a minor legal-description issue the county caught before sales began.`;
  },
};

const purchase_from_trust: Pattern = {
  id: "purchase_from_trust",
  match: (g) => {
    const inst = g.instruments.find(isDeed);
    if (!inst) return false;
    const grantors = grantorNames(inst);
    return grantors.length > 0 && grantors.every(isTrustEntity);
  },
  render: (g) => {
    const deed = g.instruments.find(isDeed)!;
    const trustName = grantorNames(deed)[0];
    const buyers = granteeFamilyPhrase(deed);
    return `In ${year(deed.recording_date)}, ${buyers} purchased the home from ${trustName} — a revocable family living trust, a common way families pass homes between generations.`;
  },
};

const purchase_from_individual: Pattern = {
  id: "purchase_from_individual",
  match: (g) => {
    const inst = g.instruments.find(isDeed);
    if (!inst) return false;
    const grantors = grantorNames(inst);
    return grantors.length > 0 && !grantors.some(isTrustEntity);
  },
  render: (g) => {
    const deed = g.instruments.find(isDeed)!;
    const buyers = granteeFamilyPhrase(deed);
    const sellers = grantorsPhrase(deed);
    return `In ${year(deed.recording_date)}, ${buyers} bought the home from ${sellers}.`;
  },
};

const purchase_money_dot: Pattern = {
  id: "purchase_money_dot",
  match: (g, ctx) => {
    const dot = g.instruments.find(isDOT);
    if (!dot) return false;
    const sameDay = dot.same_day_group ?? [];
    if (sameDay.length === 0) return false;
    return sameDay.some((n) =>
      ctx.allInstruments.some((i) => i.instrument_number === n && isDeed(i)),
    );
  },
  render: (g) => {
    const dot = g.instruments.find(isDOT)!;
    return `They financed the purchase with a mortgage from ${lenderName(dot)}, recorded the same day as the sale.`;
  },
};

const refinance_dot: Pattern = {
  id: "refinance_dot",
  match: (g, ctx) => {
    const dot = g.instruments.find(isDOT);
    if (!dot) return false;
    const sameDay = dot.same_day_group ?? [];
    const hasSameDayDeed = sameDay.some((n) =>
      ctx.allInstruments.some((i) => i.instrument_number === n && isDeed(i)),
    );
    return !hasSameDayDeed;
  },
  render: (g) => {
    const dot = g.instruments.find(isDOT)!;
    return `On ${dot.recording_date}, they refinanced with a new mortgage from ${lenderName(dot)} — a typical pattern for homeowners locking in lower rates.`;
  },
};

const heloc_dot: Pattern = {
  id: "heloc_dot",
  match: (g) => g.instruments.some((i) => i.document_type === "heloc_dot"),
  render: (g) => {
    const inst = g.instruments.find((i) => i.document_type === "heloc_dot")!;
    return `On ${inst.recording_date}, they opened a home-equity line of credit with ${lenderName(inst)}.`;
  },
};

export const PATTERNS: Pattern[] = [
  subdivision_plat,
  affidavit_of_correction,
  purchase_from_trust,
  purchase_from_individual,
  purchase_money_dot,
  heloc_dot,
  refinance_dot,
];

export function findMatchingPattern(
  group: InstrumentGroup,
  ctx: PatternContext
): Pattern | null {
  for (const p of PATTERNS) {
    if (p.match(group, ctx)) return p;
  }
  return null;
}
