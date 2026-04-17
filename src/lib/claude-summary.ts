import Anthropic from "@anthropic-ai/sdk";
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

// Prototype-only: we call Claude directly from the browser. A production
// build would proxy this through a server so the API key never leaves the
// custodian's infrastructure. The dangerouslyAllowBrowser flag is a
// conscious tradeoff for the 2-day demo.
function makeClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

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

export const SYSTEM_PROMPT: string = `You are a title examiner explaining a residential property's chain of title to the homeowner in plain English.

Rules (non-negotiable):
1. Use ONLY facts present in the supplied JSON. Never invent parties, dates, loan amounts, or document types.
2. Every factual claim MUST cite its source instrument by recording number in square brackets, e.g. "In 2013, the property was sold to the Popham family [20130183449]."
3. If multiple instruments support one claim, cite each one: "[20210057846] [20210057847]".
4. Keep the summary under 220 words. Use short paragraphs a non-lawyer can scan.
5. Call out anything a homeowner should ask about: open deeds of trust, MERS-as-nominee beneficiaries, releases executed by a different party than the original lender, subdivision-level obligations (plats, HOA), or anomalies flagged in the "anomalies" array.
6. If the chain has gaps (e.g. owner before the first recorded deed is not in the data), say so — do not guess.
7. No disclaimers, no "I'm an AI", no restating the rules. Just the summary.`;

export function buildUserMessage(input: SummaryInput): string {
  const payload = buildContext(input);
  return `Parcel corpus (JSON):\n\n${JSON.stringify(payload, null, 2)}\n\nSummarize this parcel's chain of title for the homeowner. Follow every rule in your instructions.`;
}

export interface SummaryCallbacks {
  onText: (delta: string) => void;
  onDone: (fullText: string) => void;
  onError: (err: Error) => void;
  signal?: AbortSignal;
}

export async function streamChainSummary(
  apiKey: string,
  input: SummaryInput,
  cb: SummaryCallbacks,
): Promise<void> {
  const client = makeClient(apiKey);
  const userMessage = buildUserMessage(input);

  try {
    const stream = client.messages.stream(
      {
        model: "claude-opus-4-7",
        max_tokens: 1024,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
      },
      { signal: cb.signal },
    );

    stream.on("text", (delta) => cb.onText(delta));
    const finalMessage = await stream.finalMessage();
    const fullText = finalMessage.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    cb.onDone(fullText);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      cb.onError(
        new Error(
          "Anthropic rejected the API key. Paste a valid key and retry.",
        ),
      );
    } else if (err instanceof Anthropic.RateLimitError) {
      cb.onError(new Error("Rate limited by Anthropic — wait a moment and retry."));
    } else if (err instanceof Anthropic.APIError) {
      cb.onError(new Error(`Anthropic API error ${err.status}: ${err.message}`));
    } else if (err instanceof Error) {
      cb.onError(err);
    } else {
      cb.onError(new Error("Unknown error calling Anthropic."));
    }
  }
}
