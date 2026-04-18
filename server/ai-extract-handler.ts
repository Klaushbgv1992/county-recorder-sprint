/**
 * Serverless-style handler for POST /api/extract.
 *
 * Lives in ./server so it's trivially portable — a Vercel / Netlify /
 * Cloudflare function, or a tiny Node HTTP listener, can wrap it in ten
 * lines. In this repo it's mounted by the Vite dev plugin at
 * vite-plugins/ai-extract.ts.
 *
 * The handler:
 *   1. Accepts { recordingNumber: string } JSON.
 *   2. Fetches the PDF from publicapi.recorder.maricopa.gov server-side
 *      (browsers cannot fetch it directly — no CORS headers, and we want
 *      to hide the Anthropic key anyway).
 *   3. Streams Claude Opus 4.7 against the PDF using a single tool call
 *      per field (record_extraction). Each tool_use block that finishes
 *      is emitted to the client as an NDJSON event, producing the "watch
 *      fields populate" UX.
 *
 * The handler does not persist anything. Every run is independent — this
 * is a demo-only surface, not an extraction pipeline.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  LIVE_EXTRACT_FIELDS,
  LIVE_EXTRACT_MODEL_ID,
  RECORD_EXTRACTION_TOOL,
  SYSTEM_PROMPT,
  isRecordingNumber,
  maricopaPdfUrl,
  type LiveExtractFieldName,
  type LiveExtractStreamEvent,
} from "../src/lib/ai-extract-prompt";

/**
 * Thin subset of `Anthropic` we actually use. Tests inject a fake.
 */
export interface AnthropicLike {
  messages: {
    stream(body: unknown): AsyncIterable<AnthropicStreamEvent> & {
      finalMessage: () => Promise<{
        content: AnthropicContentBlock[];
        usage: {
          input_tokens: number;
          output_tokens: number;
          cache_creation_input_tokens?: number | null;
          cache_read_input_tokens?: number | null;
        };
      }>;
    };
  };
}

export interface ExtractHandlerDeps {
  /** Fetch the PDF bytes. Default: fetch from Maricopa public API. */
  fetchPdf?: (recordingNumber: string) => Promise<{
    bytes: Uint8Array;
    contentType: string;
  }>;
  /** Anthropic SDK instance. Default: `new Anthropic()` using env key. */
  anthropic?: AnthropicLike;
  /** Clock for deterministic tests. Default: performance.now(). */
  now?: () => number;
}

export interface ExtractRequest {
  recordingNumber: string;
}

/**
 * Emit function the caller provides — one call per NDJSON line. The
 * middleware writes directly to the HTTP response stream; tests push to
 * an array.
 */
export type EmitFn = (event: LiveExtractStreamEvent) => void | Promise<void>;

const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25 MB — matches Claude's doc size cap

async function defaultFetchPdf(
  recordingNumber: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const url = maricopaPdfUrl(recordingNumber);
  const res = await fetch(url, {
    headers: {
      // The public API sometimes returns HTML without an explicit Accept
      "Accept": "application/pdf,*/*;q=0.8",
    },
  });
  if (!res.ok) {
    throw new ExtractError(
      `Maricopa API returned ${res.status} for recording ${recordingNumber}`,
      res.status >= 500,
    );
  }
  const contentType = res.headers.get("content-type") ?? "application/pdf";
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength === 0) {
    throw new ExtractError("Maricopa API returned empty body", true);
  }
  if (buf.byteLength > MAX_PDF_BYTES) {
    throw new ExtractError(
      `PDF is ${buf.byteLength} bytes (> ${MAX_PDF_BYTES} cap)`,
      false,
    );
  }
  return { bytes: buf, contentType };
}

export class ExtractError extends Error {
  readonly retriable: boolean;
  constructor(message: string, retriable: boolean) {
    super(message);
    this.retriable = retriable;
    this.name = "ExtractError";
  }
}

/**
 * Core handler. Consumes a request + emitter, streams events, resolves
 * when the model is done. Never throws for normal runtime errors — those
 * are emitted as `{type: "error"}` events. Only throws on programmer
 * errors (bad arguments, missing deps).
 */
export async function runExtraction(
  req: ExtractRequest,
  emit: EmitFn,
  deps: ExtractHandlerDeps = {},
): Promise<void> {
  const now = deps.now ?? (() => Date.now());
  const started = now();

  if (!isRecordingNumber(req.recordingNumber)) {
    await emit({
      type: "error",
      message: `Invalid recording number: ${req.recordingNumber}. Expect 11 digits (e.g. 20210075858).`,
      retriable: false,
    });
    return;
  }

  const fetchPdf = deps.fetchPdf ?? defaultFetchPdf;
  let pdfBytes: Uint8Array;
  try {
    const fetched = await fetchPdf(req.recordingNumber);
    pdfBytes = fetched.bytes;
  } catch (err) {
    const isExtractErr = err instanceof ExtractError;
    await emit({
      type: "error",
      message: isExtractErr ? err.message : `PDF fetch failed: ${(err as Error).message}`,
      retriable: isExtractErr ? err.retriable : true,
    });
    return;
  }

  await emit({
    type: "meta",
    recording_number: req.recordingNumber,
    model: LIVE_EXTRACT_MODEL_ID,
    started_at: new Date().toISOString(),
    pdf_bytes: pdfBytes.byteLength,
  });

  const anthropic = deps.anthropic ?? (new Anthropic() as unknown as AnthropicLike);
  const base64 = bytesToBase64(pdfBytes);

  const body = {
    model: LIVE_EXTRACT_MODEL_ID,
    max_tokens: 2048,
    system: [
      {
        type: "text" as const,
        text: SYSTEM_PROMPT,
        // Cache the system prompt — every demo run shares the same prefix,
        // so after the first call the model sees it as a cache read.
        cache_control: { type: "ephemeral" as const },
      },
    ],
    tools: [RECORD_EXTRACTION_TOOL],
    // Force Claude to use the tool — no free-text answers, no skipping fields.
    tool_choice: { type: "any" as const, disable_parallel_tool_use: false },
    messages: [
      {
        role: "user" as const,
        content: [
          {
            type: "document" as const,
            source: {
              type: "base64" as const,
              media_type: "application/pdf" as const,
              data: base64,
            },
          },
          {
            type: "text" as const,
            text: `Extract these fields, one tool call each, in order: ${LIVE_EXTRACT_FIELDS.join(", ")}. Remember: no field may be skipped.`,
          },
        ],
      },
    ],
  };

  let stream: ReturnType<AnthropicLike["messages"]["stream"]>;
  try {
    stream = anthropic.messages.stream(body);
  } catch (err) {
    await emit({
      type: "error",
      message: `Anthropic call failed: ${(err as Error).message}`,
      retriable: true,
    });
    return;
  }

  // Per-block accumulator. Claude streams tool_use input as
  // input_json_delta fragments; assemble them per index so we can emit
  // each field AS ITS tool_use block finishes — the "watch fields
  // populate" UX demands per-block emission, not one final dump.
  const pending = new Map<number, { id: string; name: string; partialJson: string }>();
  const seenFieldNames = new Set<string>();

  async function emitCompletedBlock(index: number): Promise<void> {
    const p = pending.get(index);
    if (!p) return;
    pending.delete(index);
    if (p.name !== RECORD_EXTRACTION_TOOL.name) return;
    let input: Record<string, unknown>;
    try {
      input = JSON.parse(p.partialJson || "{}") as Record<string, unknown>;
    } catch {
      return;
    }
    const field_name = input.field_name;
    const confidence = input.confidence;
    const reasoning = input.reasoning;
    if (
      typeof field_name !== "string" ||
      typeof confidence !== "number" ||
      typeof reasoning !== "string" ||
      !LIVE_EXTRACT_FIELDS.includes(field_name as LiveExtractFieldName) ||
      seenFieldNames.has(field_name)
    ) {
      return;
    }
    seenFieldNames.add(field_name);
    await emit({
      type: "field",
      field_name: field_name as LiveExtractFieldName,
      value: input.value,
      confidence,
      reasoning,
      at_ms: Math.round(now() - started),
    });
  }

  try {
    for await (const rawEvent of stream) {
      const event = rawEvent as AnthropicStreamEvent;
      if (event.type === "content_block_start") {
        const block = event.content_block;
        if (block && block.type === "tool_use") {
          pending.set(event.index, {
            id: block.id,
            name: block.name,
            partialJson: "",
          });
        }
      } else if (event.type === "content_block_delta") {
        const delta = event.delta as { type?: string; partial_json?: string };
        if (delta && delta.type === "input_json_delta" && typeof delta.partial_json === "string") {
          const entry = pending.get(event.index);
          if (entry) entry.partialJson += delta.partial_json;
        }
      } else if (event.type === "content_block_stop") {
        await emitCompletedBlock(event.index);
      }
    }

    const final = await stream.finalMessage();
    await emit({
      type: "done",
      usage: {
        input_tokens: final.usage.input_tokens,
        output_tokens: final.usage.output_tokens,
        cache_creation_input_tokens: final.usage.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: final.usage.cache_read_input_tokens ?? 0,
      },
      total_ms: Math.round(now() - started),
    });
  } catch (err) {
    await emit({
      type: "error",
      message: `Stream failed: ${(err as Error).message}`,
      retriable: true,
    });
  }
}

// -- Internal types ---------------------------------------------------------

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: unknown;
    };

type AnthropicStreamEvent =
  | {
      type: "content_block_start";
      index: number;
      content_block: AnthropicContentBlock;
    }
  | { type: "content_block_delta"; index: number; delta: unknown }
  | { type: "content_block_stop"; index: number }
  | { type: "message_start"; message: unknown }
  | { type: "message_delta"; delta: unknown; usage?: unknown }
  | { type: "message_stop" }
  | { type: "ping" };

// Base64 encode without Node Buffer dependency (works in edge runtimes).
function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // btoa is available in modern runtimes (browsers, Deno, Bun, Cloudflare).
  return btoa(binary);
}
