// src/logic/homeowner-answers.ts
import type { Parcel, Instrument } from "../types";
import type { z } from "zod";
import { EncumbranceLifecycle } from "../schemas";
import { subjectPhraseFromParties, cleanEntityName, isEntityName } from "../narrative/subject-phrase";

type Lifecycle = z.infer<typeof EncumbranceLifecycle>;

export interface HomeownerAnswers {
  titleClean: { clean: boolean; openCount: number; openLifecycleIds: string[] };
  lastSale: {
    found: boolean;
    recordingNumber: string;
    recording_date: string;
    year: string;
    buyersPhrase: string;
    sellersPhrase: string;
    priceDisplay: string;
    priceProvenance: string | null;
    // provenance is public_api for the recording-date shell, manual_entry
    // for the grantor/grantee attribution. We carry the weakest link.
    provenance: "public_api" | "ocr" | "manual_entry" | "none";
  };
  openLiens: {
    count: number;
    summaries: Array<{ lifecycleId: string; rationale: string; rootInstrument: string }>;
  };
  lenderHistory: {
    entries: Array<{
      recordingNumber: string;
      year: string;
      recording_date: string;
      lenderDisplayName: string;
      provenance: "public_api" | "ocr" | "manual_entry";
    }>;
  };
}

function isDeed(i: Instrument): boolean {
  return (
    i.document_type === "warranty_deed" ||
    i.document_type === "special_warranty_deed" ||
    i.document_type === "quit_claim_deed" ||
    i.document_type === "grant_deed"
  );
}

function isDOTLike(i: Instrument): boolean {
  return i.document_type === "deed_of_trust" || i.document_type === "heloc_dot";
}

// Collapse all provenance values to the three display variants.
// "algorithmic" and "demo_synthetic" are treated as "manual_entry" for display.
function collapseProvenance(raw: string): "public_api" | "ocr" | "manual_entry" {
  if (raw === "public_api" || raw === "ocr" || raw === "manual_entry") return raw;
  return "manual_entry";
}

function pickLender(inst: Instrument): { name: string; provenance: "public_api" | "ocr" | "manual_entry" } {
  const lender = inst.parties.find((p) => p.role === "lender");
  if (lender) {
    return { name: lender.name, provenance: collapseProvenance(lender.provenance) };
  }
  const beneficiary = inst.parties.find((p) => p.role === "beneficiary");
  if (beneficiary?.nominee_for) {
    return { name: beneficiary.nominee_for.party_name, provenance: collapseProvenance(beneficiary.provenance) };
  }
  if (beneficiary) {
    return { name: beneficiary.name, provenance: collapseProvenance(beneficiary.provenance) };
  }
  return { name: "a lender", provenance: "manual_entry" };
}

function displayLender(raw: string): string {
  if (isEntityName(raw)) return cleanEntityName(raw);
  return raw
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function computeHomeownerAnswers(
  parcel: Parcel,
  instruments: Instrument[],
  lifecycles: Lifecycle[],
): HomeownerAnswers {
  const parcelInstrumentNumbers = new Set(
    parcel.instrument_numbers ?? instruments.map((i) => i.instrument_number),
  );

  // Only lifecycles whose root instrument belongs to this parcel.
  const parcelLifecycles = lifecycles.filter((lc) => parcelInstrumentNumbers.has(lc.root_instrument));
  const openLifecycles = parcelLifecycles.filter((lc) => {
    const effective = lc.examiner_override ?? lc.status;
    return effective === "open" || effective === "unresolved";
  });

  const deeds = instruments
    .filter(isDeed)
    .slice()
    .sort((a, b) => b.recording_date.localeCompare(a.recording_date));
  const latestDeed = deeds[0] ?? null;

  // Optional price from extracted_fields; Maricopa rarely records price — default "not recorded".
  const priceField = latestDeed?.extracted_fields?.["sale_price"] ?? latestDeed?.extracted_fields?.["consideration"];

  const dotLike = instruments
    .filter(isDOTLike)
    .slice()
    .sort((a, b) => a.recording_date.localeCompare(b.recording_date));

  return {
    titleClean: {
      clean: openLifecycles.length === 0,
      openCount: openLifecycles.length,
      openLifecycleIds: openLifecycles.map((lc) => lc.id),
    },
    lastSale: latestDeed
      ? {
          found: true,
          recordingNumber: latestDeed.instrument_number,
          recording_date: latestDeed.recording_date,
          year: latestDeed.recording_date.slice(0, 4),
          buyersPhrase: subjectPhraseFromParties(latestDeed.parties, "grantee"),
          sellersPhrase: subjectPhraseFromParties(latestDeed.parties, "grantor"),
          priceDisplay: priceField ? priceField.value : "Price not recorded by the county",
          priceProvenance: priceField ? priceField.provenance : null,
          provenance: priceField ? collapseProvenance(priceField.provenance) : "public_api",
        }
      : {
          found: false,
          recordingNumber: "",
          recording_date: "",
          year: "",
          buyersPhrase: "",
          sellersPhrase: "",
          priceDisplay: "",
          priceProvenance: null,
          provenance: "none",
        },
    openLiens: {
      count: openLifecycles.length,
      summaries: openLifecycles.map((lc) => ({
        lifecycleId: lc.id,
        rationale: lc.status_rationale,
        rootInstrument: lc.root_instrument,
      })),
    },
    lenderHistory: {
      entries: dotLike.map((inst) => {
        const lender = pickLender(inst);
        return {
          recordingNumber: inst.instrument_number,
          year: inst.recording_date.slice(0, 4),
          recording_date: inst.recording_date,
          lenderDisplayName: displayLender(lender.name),
          provenance: lender.provenance,
        };
      }),
    },
  };
}
