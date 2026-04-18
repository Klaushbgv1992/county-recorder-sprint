import type {
  Parcel,
  Instrument,
  EncumbranceLifecycle,
} from "../types";
import type { StaffAnomaly } from "../schemas";
import {
  getGrantors,
  getGrantees,
  getTrustors,
  getLenders,
  getReleasingParties,
} from "../logic/party-roles";

export interface SummaryInput {
  parcel: Parcel;
  instruments: Instrument[];
  lifecycles: EncumbranceLifecycle[];
  findings: StaffAnomaly[];
}

// Compact the corpus into a JSON shape that's small, grounded, and
// unambiguous. Every factual field Claude might cite is present with a
// recording_number for citation back — no invented parties, no date
// drift.
function buildContext(input: SummaryInput) {
  return {
    parcel: {
      apn: input.parcel.apn,
      address: `${input.parcel.address}, ${input.parcel.city} ${input.parcel.state}`,
      subdivision: input.parcel.subdivision,
      current_owner: input.parcel.current_owner,
      legal_description: input.parcel.legal_description,
    },
    instruments: input.instruments
      .slice()
      .sort(
        (a, b) =>
          new Date(a.recording_date).getTime() -
          new Date(b.recording_date).getTime(),
      )
      .map((i) => ({
        recording_number: i.instrument_number,
        document_type: i.document_type,
        recording_date: i.recording_date,
        grantors: getGrantors(i),
        grantees: getGrantees(i),
        trustors: getTrustors(i),
        lenders: getLenders(i),
        releasing_parties: getReleasingParties(i),
        legal_description: i.legal_description?.value?.slice(0, 300) ?? null,
      })),
    lifecycles: input.lifecycles.map((lc) => ({
      root_instrument: lc.root_instrument,
      child_instruments: lc.child_instruments,
      status: lc.status,
      rationale: lc.status_rationale,
    })),
    anomalies: input.findings.map((f) => ({
      severity: f.severity,
      title: f.title,
      evidence_instruments: f.references,
    })),
  };
}

export const SYSTEM_PROMPT: string = `You are a title examiner producing a concise parcel brief for another title examiner or abstractor who is researching this property in the course of preparing a title commitment or client abstract. The reader is a practitioner, not the homeowner.

Voice (non-negotiable):
- Third-person, neutral, practitioner register.
- Refer to the property as "the property" or "the subject parcel."
- Refer to owners by surname ("the Hogues," "Mr. Lorance") or by entity name, NEVER as "you" or "your."
- Frame follow-ups as items for the abstract or commitment — never as questions for the homeowner.

Rules (non-negotiable):
1. Use ONLY facts present in the supplied JSON. Never invent parties, dates, loan amounts, or document types.
2. Every factual claim MUST cite its source instrument by recording number in square brackets, e.g. "In 2013 the property was conveyed to the Popham family [20130183449]."
3. If multiple instruments support one claim, cite each: "[20210057846] [20210057847]".
4. Keep the brief under 220 words. Short paragraphs scannable by a practitioner.
5. Flag items an examiner would want on the commitment or Schedule B: open deeds of trust, MERS-as-nominee beneficiaries without a recorded assignment, releases executed by a different party than the original lender, subdivision-level obligations (plats, HOA), or anomalies flagged in the "anomalies" array.
6. If the chain has gaps (e.g., ownership before the first recorded deed is not in the data), state the gap — do not guess.
7. No disclaimers, no "I'm an AI", no restating the rules. Just the brief.

Structure (use headings only if they help readability; omit if unnecessary):
- Title line: "# Chain of title: {address}"
- Narrative: short paragraphs on subdivision context, conveyance history, and financing, in chronological order.
- Follow-ups: under the heading "## Follow-ups for the abstract" (or similar practitioner-framed header), a short bullet list of items to verify or flag on the commitment. NEVER title this section "Things to ask about," "Questions for the homeowner," or anything addressed to the owner.`;

export function buildUserMessage(input: SummaryInput): string {
  const payload = buildContext(input);
  return `Parcel corpus (JSON):\n\n${JSON.stringify(payload, null, 2)}\n\nProduce a chain-of-title brief for this parcel. The reader is a title examiner or abstractor preparing a commitment or abstract. Follow every rule in your instructions.`;
}
