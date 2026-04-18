import type { Pattern, InstrumentGroup, PatternContext } from "./types";
import type { Instrument } from "../types";
import { subjectPhraseFromParties, cleanEntityName, isEntityName } from "./subject-phrase";
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

function prettyName(s: string): string {
  if (isEntityName(s)) return cleanEntityName(s);
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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
  if (lender) return prettyName(lender.name);
  // MERS-as-nominee edge case: unwrap to real lender if available
  const beneficiary = inst.parties.find((p) => p.role === "beneficiary");
  if (beneficiary?.nominee_for) return prettyName(beneficiary.nominee_for.party_name);
  if (beneficiary) return prettyName(beneficiary.name);
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
    return `Your lot was first platted as part of ${meta.display_name}, a subdivision recorded ${meta.dedication_date} by ${prettyName(meta.dedicated_by)}.`;
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
    const trustName = cleanEntityName(grantorNames(deed)[0]);
    const buyers = subjectPhraseFromParties(deed.parties, "grantee");
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
    const buyers = subjectPhraseFromParties(deed.parties, "grantee");
    const sellers = subjectPhraseFromParties(deed.parties, "grantor");
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

function releasingPartyName(inst: Instrument): string | null {
  const rp = inst.parties.find((p) => p.role === "releasing_party");
  return rp ? rp.name : null;
}

function originalBeneficiary(
  releaseInst: Instrument,
  ctx: PatternContext,
): string | null {
  for (const ref of releaseInst.back_references) {
    const referenced = ctx.allInstruments.find((i) => i.instrument_number === ref);
    if (!referenced) continue;
    const ben = referenced.parties.find((p) => p.role === "beneficiary");
    if (ben) {
      // Prefer real lender when beneficiary is a nominee
      return ben.nominee_for ? ben.nominee_for.party_name : ben.name;
    }
    const lender = referenced.parties.find((p) => p.role === "lender");
    if (lender) return lender.name;
  }
  return null;
}

function namesEquivalent(a: string, b: string): boolean {
  const norm = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "");
  return norm(a).includes(norm(b)) || norm(b).includes(norm(a));
}

const release_clean: Pattern = {
  id: "release_clean",
  match: (g, ctx) => {
    const inst = g.instruments.find((i) => i.document_type === "full_reconveyance");
    if (!inst) return false;
    const releaser = releasingPartyName(inst);
    const original = originalBeneficiary(inst, ctx);
    if (!releaser || !original) return false;
    return namesEquivalent(releaser, original);
  },
  render: (g) => {
    const inst = g.instruments.find((i) => i.document_type === "full_reconveyance")!;
    return `That mortgage was paid off on ${inst.recording_date}.`;
  },
};

const release_by_third_party: Pattern = {
  id: "release_by_third_party",
  match: (g, ctx) => {
    const inst = g.instruments.find((i) => i.document_type === "full_reconveyance");
    if (!inst) return false;
    const releaser = releasingPartyName(inst);
    const original = originalBeneficiary(inst, ctx);
    if (!releaser || !original) return false;
    return !namesEquivalent(releaser, original);
  },
  render: (g) => {
    const inst = g.instruments.find((i) => i.document_type === "full_reconveyance")!;
    const releaser = prettyName(releasingPartyName(inst)!);
    return `That mortgage was paid off on ${inst.recording_date} — the release was signed by ${releaser}, not the original lender, because the loan had been sold or transferred. The county records the release either way.`;
  },
};

const ucc_termination: Pattern = {
  id: "ucc_termination",
  match: (g) => g.instruments.some((i) => i.document_type === "ucc_termination"),
  render: (g) => {
    const inst = g.instruments.find((i) => i.document_type === "ucc_termination")!;
    return `A UCC financing statement — a filing used for personal-property collateral like solar leases — was terminated on ${inst.recording_date}.`;
  },
};

export const partial_chain_disclosure: Pattern = {
  id: "partial_chain_disclosure",
  match: (_g, ctx) => ctx.mode === "partial",
  // This pattern is rendered once at the top of the timeline, separate from
  // per-group iteration. The engine handles it specially in renderTimeline.
  render: (_g, ctx) => {
    const n = ctx.allInstruments.length;
    return `The county has ${n} recorded document${n === 1 ? "" : "s"} for this parcel — here's what we can see. This isn't a complete ownership history; for older records, a title examiner would request the county archive. You're seeing the same authoritative record they'd see.`;
  },
};

const generic_recording: Pattern = {
  id: "generic_recording",
  match: (_g, ctx) => ctx.mode === "partial",
  render: (g) => {
    const inst = g.instruments[0];
    const names = inst.raw_api_response.names.slice(0, 3).map(prettyName).join(", ");
    const label = docTypeLabel(inst.document_type);
    const nameList = names.length > 0 ? ` naming ${names}` : "";
    return `On ${inst.recording_date}, a ${label} was recorded for this parcel${nameList}.`;
  },
};

const fallback: Pattern = {
  id: "fallback",
  match: () => true,
  render: (g) => {
    const inst = g.instruments[0];
    return `On ${inst.recording_date}, a ${docTypeLabel(inst.document_type)} was recorded.`;
  },
};

function docTypeLabel(t: Instrument["document_type"]): string {
  const labels: Record<Instrument["document_type"], string> = {
    warranty_deed: "Warranty Deed",
    special_warranty_deed: "Special Warranty Deed",
    quit_claim_deed: "Quit Claim Deed",
    grant_deed: "Grant Deed",
    deed_of_trust: "Deed of Trust",
    assignment_of_dot: "Assignment of Deed of Trust",
    substitution_of_trustee: "Substitution of Trustee",
    full_reconveyance: "Full Reconveyance",
    partial_reconveyance: "Partial Reconveyance",
    modification: "Modification",
    heloc_dot: "HELOC Deed of Trust",
    ucc_termination: "UCC Termination",
    hoa_lien: "HOA Lien",
    affidavit_of_disclosure: "Affidavit of Disclosure",
    other: "document",
  };
  return labels[t] ?? "document";
}

export const PATTERNS: Pattern[] = [
  subdivision_plat,
  affidavit_of_correction,
  purchase_from_trust,
  purchase_from_individual,
  purchase_money_dot,
  heloc_dot,
  refinance_dot,
  release_clean,
  release_by_third_party,
  ucc_termination,
  generic_recording,
  fallback,
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
