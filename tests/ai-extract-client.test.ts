import { describe, expect, it } from "vitest";
import { parseNdjsonStream } from "../src/lib/ai-extract-client";
import type { LiveExtractStreamEvent } from "../src/lib/ai-extract-prompt";

/**
 * ReadableStream from a fixed list of UTF-8 chunks.
 */
function readableStreamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(enc.encode(chunks[i++]));
      } else {
        controller.close();
      }
    },
  });
}

async function collect(
  stream: ReadableStream<Uint8Array>,
): Promise<LiveExtractStreamEvent[]> {
  const out: LiveExtractStreamEvent[] = [];
  for await (const ev of parseNdjsonStream(stream)) out.push(ev);
  return out;
}

describe("parseNdjsonStream", () => {
  it("emits one event per newline-terminated JSON object", async () => {
    const stream = readableStreamOf([
      '{"type":"meta","recording_number":"20210057847","model":"claude-opus-4-7","started_at":"2026-04-17T00:00:00Z","pdf_bytes":12345}\n',
      '{"type":"field","field_name":"document_type","value":"DOT","confidence":0.9,"reasoning":"a","at_ms":500}\n',
      '{"type":"done","usage":{"input_tokens":100,"output_tokens":20,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"total_ms":1500}\n',
    ]);
    const events = await collect(stream);
    expect(events.map((e) => e.type)).toEqual(["meta", "field", "done"]);
  });

  it("handles chunks that split a JSON line across boundaries", async () => {
    // Split an event in half — both halves have to assemble into one
    const line =
      '{"type":"field","field_name":"recording_date","value":"2021-01-19","confidence":0.98,"reasoning":"stamp","at_ms":800}\n';
    const stream = readableStreamOf([
      line.slice(0, 30),
      line.slice(30, 70),
      line.slice(70),
    ]);
    const events = await collect(stream);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("field");
    if (events[0].type === "field") {
      expect(events[0].value).toBe("2021-01-19");
    }
  });

  it("yields the trailing non-newline-terminated object", async () => {
    const stream = readableStreamOf([
      '{"type":"meta","recording_number":"20210057847","model":"claude-opus-4-7","started_at":"2026-04-17T00:00:00Z","pdf_bytes":1}',
    ]);
    const events = await collect(stream);
    expect(events).toHaveLength(1);
  });

  it("skips malformed lines without throwing", async () => {
    const stream = readableStreamOf([
      'garbage\n',
      '{"type":"done","usage":{"input_tokens":1,"output_tokens":2,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"total_ms":10}\n',
    ]);
    const events = await collect(stream);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("done");
  });
});
