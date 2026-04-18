/**
 * Browser-side client for /api/extract. Parses the NDJSON stream and
 * yields typed events. Kept framework-free so it's easy to unit-test.
 */

import type { LiveExtractStreamEvent } from "./ai-extract-prompt";

export interface ExtractClientOptions {
  signal?: AbortSignal;
  endpoint?: string;
  fetchFn?: typeof fetch;
}

/**
 * POST to /api/extract and asynchronously yield parsed events.
 * Throws on transport-level errors (404, 500 with no body); the handler
 * itself emits `{type: "error"}` events for runtime errors — those are
 * returned to the caller as ordinary stream events, not thrown.
 */
export async function* streamLiveExtraction(
  recordingNumber: string,
  opts: ExtractClientOptions = {},
): AsyncGenerator<LiveExtractStreamEvent, void, void> {
  const endpoint = opts.endpoint ?? "/api/extract";
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recordingNumber }),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`Extract request failed (${res.status}): ${text.slice(0, 400)}`);
  }
  yield* parseNdjsonStream(res.body);
}

export async function* parseNdjsonStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<LiveExtractStreamEvent, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });
      let newlineIdx: number;
      while ((newlineIdx = buffered.indexOf("\n")) !== -1) {
        const line = buffered.slice(0, newlineIdx).trim();
        buffered = buffered.slice(newlineIdx + 1);
        if (!line) continue;
        try {
          yield JSON.parse(line) as LiveExtractStreamEvent;
        } catch {
          // Skip malformed lines; the handler is supposed to write well-
          // formed JSON, but a proxy could insert debug noise.
        }
      }
    }
    const tail = buffered.trim();
    if (tail) {
      try {
        yield JSON.parse(tail) as LiveExtractStreamEvent;
      } catch {
        /* ignore */
      }
    }
  } finally {
    reader.releaseLock();
  }
}
