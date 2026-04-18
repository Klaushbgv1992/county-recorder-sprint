/**
 * Shared prompt + tool schema for the live AI extraction demo.
 *
 * Importable from both the Vite middleware (Node/server side) and the
 * React component (browser). The disclosure drawer renders `SYSTEM_PROMPT`
 * verbatim so the viewer sees exactly what the model sees.
 *
 * Keep this file free of Node-only or DOM-only imports.
 */

export const LIVE_EXTRACT_MODEL_ID = "claude-opus-4-7" as const;

export const LIVE_EXTRACT_FIELDS = [
  "document_type",
  "recording_date",
  "grantors",
  "grantees",
  "legal_description",
] as const;

export type LiveExtractFieldName = (typeof LIVE_EXTRACT_FIELDS)[number];

export const SYSTEM_PROMPT = `You are an AI assistant helping a residential title examiner inspect a single recorded document from Maricopa County, Arizona.

A PDF of the recorded instrument is attached. It is a scanned image ("Unofficial Document" watermark is expected). Your job is to extract five well-defined fields by looking at the image pages and calling the record_extraction tool once per field.

FIELDS (call the tool exactly once for each, in this order):
1. document_type — a short, precise label for the instrument type (e.g. "Deed of Release and Full Reconveyance of Deed of Trust", "Warranty Deed", "Deed of Trust", "Affidavit of Correction", "Termination of Financing Statement"). Use Maricopa-AZ title-examiner terminology.
2. recording_date — ISO date YYYY-MM-DD of the county recording stamp (the date marked by the Recorder's Office, not the notary date or execution date).
3. grantors — JSON array of party names who are the grantors / trustors / releasing parties (the conveying side). Preserve the exact spelling in the document, including middle initials and commas.
4. grantees — JSON array of party names who are the grantees / beneficiaries (the receiving side). For a Deed of Trust, the beneficiary (typically a lender or MERS) is the grantee.
5. legal_description — the verbatim legal description (e.g. "Lot 46, SEVILLE PARCEL 3, according to Book 554 of Maps, Page 19, records of Maricopa County, Arizona"). If split across multiple lines, join with single spaces. If the document references an exhibit that is not visible, say so instead of inventing content.

CONFIDENCE RUBRIC (0.0 – 1.0):
- 0.95–1.00: The field is explicitly printed and unambiguous.
- 0.80–0.94: Clear but required minor judgment (e.g. normalizing a date format, choosing the canonical document type from a short-code).
- 0.60–0.79: Partially obscured, inferred from document context, or one plausible reading among two.
- < 0.60: You genuinely do not know — call the tool anyway with value "unknown" and a confidence below 0.60.

REASONING: Every tool call must include a one-sentence reasoning field citing where in the document you found the value (e.g. "Recording stamp on page 1, top right" or "Granting clause, page 1 paragraph 2").

DO NOT invent values. DO NOT skip fields — if a field is truly absent, call the tool with value "unknown" / [] / "" as appropriate and confidence below 0.60.`;

/**
 * JSON schema for the `record_extraction` tool. Kept inline (not a Zod
 * schema) because this is the exact schema shipped to the Claude API.
 */
export const RECORD_EXTRACTION_TOOL = {
  name: "record_extraction",
  description:
    "Record a single extracted field. Call once per field. Each call is an atomic commitment — do not re-call for the same field_name.",
  input_schema: {
    type: "object",
    properties: {
      field_name: {
        type: "string",
        enum: [...LIVE_EXTRACT_FIELDS],
        description: "Which field this call is recording.",
      },
      value: {
        description:
          "The extracted value. For document_type: string. For recording_date: ISO YYYY-MM-DD string. For grantors / grantees: array of strings. For legal_description: string.",
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description:
          "Your confidence 0.0-1.0 per the rubric in the system prompt.",
      },
      reasoning: {
        type: "string",
        description:
          "One sentence citing where in the document you found this value.",
      },
    },
    required: ["field_name", "value", "confidence", "reasoning"],
  },
} as const;

/**
 * Stream event shapes written by the server as NDJSON, read by the browser.
 * Keep this union in sync between handler and client — the middleware and
 * client both import these types, so TypeScript catches drift.
 */
export type LiveExtractStreamEvent =
  | {
      type: "meta";
      recording_number: string;
      model: string;
      started_at: string;
      pdf_bytes: number;
    }
  | {
      type: "field";
      field_name: LiveExtractFieldName;
      value: unknown;
      confidence: number;
      reasoning: string;
      at_ms: number;
    }
  | {
      type: "done";
      usage: {
        input_tokens: number;
        output_tokens: number;
        cache_creation_input_tokens: number;
        cache_read_input_tokens: number;
      };
      total_ms: number;
    }
  | {
      type: "error";
      message: string;
      retriable: boolean;
    };

/** 11-digit Maricopa recording number, e.g. 20210075858. */
export function isRecordingNumber(s: string): boolean {
  return /^\d{11}$/.test(s);
}

export function maricopaPdfUrl(recordingNumber: string): string {
  return `https://publicapi.recorder.maricopa.gov/preview/pdf?recordingNumber=${recordingNumber}`;
}
