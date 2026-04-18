import { describe, expect, it, vi } from "vitest";
import {
  runExtraction,
  type AnthropicLike,
  type EmitFn,
} from "../server/ai-extract-handler";
import type { LiveExtractStreamEvent } from "../src/lib/ai-extract-prompt";

/**
 * These tests exercise runExtraction against a fake Anthropic client
 * and a fake PDF fetcher — no network, no API key required.
 *
 * The fake stream yields synthetic `content_block_*` events shaped like
 * the real SDK output, so the handler's per-tool-use accumulator is
 * tested end-to-end.
 */

function makeEmitter(): {
  emit: EmitFn;
  events: LiveExtractStreamEvent[];
} {
  const events: LiveExtractStreamEvent[] = [];
  return {
    events,
    emit: (e) => {
      events.push(e);
    },
  };
}

interface ToolUseSpec {
  fieldName: string;
  value: unknown;
  confidence: number;
  reasoning: string;
}

function makeFakeAnthropic(
  calls: ToolUseSpec[],
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  } = { input_tokens: 1000, output_tokens: 200 },
): AnthropicLike {
  const content = calls.map((c, i) => ({
    type: "tool_use" as const,
    id: `toolu_${i}`,
    name: "record_extraction",
    input: {
      field_name: c.fieldName,
      value: c.value,
      confidence: c.confidence,
      reasoning: c.reasoning,
    },
  }));

  return {
    messages: {
      stream() {
        const iter = (async function* () {
          yield { type: "message_start" as const, message: {} };
          for (let i = 0; i < calls.length; i++) {
            const c = calls[i];
            yield {
              type: "content_block_start" as const,
              index: i,
              content_block: {
                type: "tool_use" as const,
                id: `toolu_${i}`,
                name: "record_extraction",
                input: {},
              },
            };
            const inputJson = JSON.stringify({
              field_name: c.fieldName,
              value: c.value,
              confidence: c.confidence,
              reasoning: c.reasoning,
            });
            // Split across two deltas to exercise the accumulator
            yield {
              type: "content_block_delta" as const,
              index: i,
              delta: {
                type: "input_json_delta",
                partial_json: inputJson.slice(0, inputJson.length >> 1),
              },
            };
            yield {
              type: "content_block_delta" as const,
              index: i,
              delta: {
                type: "input_json_delta",
                partial_json: inputJson.slice(inputJson.length >> 1),
              },
            };
            yield {
              type: "content_block_stop" as const,
              index: i,
            };
          }
          yield { type: "message_stop" as const };
        })();
        const streamable = iter as AsyncIterable<unknown> & {
          finalMessage: () => Promise<{
            content: typeof content;
            usage: typeof usage;
          }>;
        };
        streamable.finalMessage = async () => ({ content, usage });
        return streamable as ReturnType<
          AnthropicLike["messages"]["stream"]
        >;
      },
    },
  };
}

describe("runExtraction", () => {
  it("emits a field event per completed tool_use, in order", async () => {
    const { emit, events } = makeEmitter();
    const fakePdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"
    const anthropic = makeFakeAnthropic([
      {
        fieldName: "document_type",
        value: "Deed of Trust",
        confidence: 0.96,
        reasoning: "Granting clause page 1.",
      },
      {
        fieldName: "recording_date",
        value: "2021-01-19",
        confidence: 0.98,
        reasoning: "Recording stamp.",
      },
      {
        fieldName: "grantors",
        value: ["CHRISTOPHER POPHAM", "ASHLEY POPHAM"],
        confidence: 0.88,
        reasoning: "Trustor signature block.",
      },
      {
        fieldName: "grantees",
        value: ["V I P MORTGAGE INC"],
        confidence: 0.82,
        reasoning: "Beneficiary line.",
      },
      {
        fieldName: "legal_description",
        value: "Lot 46, SEVILLE PARCEL 3, Book 554 Maps Page 19",
        confidence: 0.9,
        reasoning: "Exhibit A.",
      },
    ]);

    await runExtraction(
      { recordingNumber: "20210057847" },
      emit,
      {
        fetchPdf: async () => ({ bytes: fakePdf, contentType: "application/pdf" }),
        anthropic,
        now: () => 0,
      },
    );

    const types = events.map((e) => e.type);
    expect(types).toEqual(["meta", "field", "field", "field", "field", "field", "done"]);

    const fieldOrder = events
      .filter((e): e is Extract<LiveExtractStreamEvent, { type: "field" }> =>
        e.type === "field",
      )
      .map((e) => e.field_name);
    expect(fieldOrder).toEqual([
      "document_type",
      "recording_date",
      "grantors",
      "grantees",
      "legal_description",
    ]);

    const done = events[events.length - 1];
    expect(done.type).toBe("done");
    if (done.type === "done") {
      expect(done.usage.input_tokens).toBe(1000);
      expect(done.usage.output_tokens).toBe(200);
    }
  });

  it("emits error event when recording number is malformed", async () => {
    const { emit, events } = makeEmitter();
    await runExtraction({ recordingNumber: "nope" }, emit, {
      // Should not be called — validation short-circuits
      fetchPdf: async () => {
        throw new Error("should not fetch");
      },
      anthropic: makeFakeAnthropic([]),
    });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("error");
    if (events[0].type === "error") {
      expect(events[0].retriable).toBe(false);
    }
  });

  it("emits retriable error when PDF fetch fails", async () => {
    const { emit, events } = makeEmitter();
    await runExtraction(
      { recordingNumber: "20210057847" },
      emit,
      {
        fetchPdf: async () => {
          throw new Error("ECONNRESET");
        },
        anthropic: makeFakeAnthropic([]),
      },
    );
    expect(events.map((e) => e.type)).toEqual(["error"]);
    if (events[0].type === "error") {
      expect(events[0].retriable).toBe(true);
      expect(events[0].message).toMatch(/ECONNRESET/);
    }
  });

  it("deduplicates when the model repeats a field_name", async () => {
    const { emit, events } = makeEmitter();
    const fakePdf = new Uint8Array([0x25]);
    const anthropic = makeFakeAnthropic([
      { fieldName: "document_type", value: "First", confidence: 0.9, reasoning: "a" },
      { fieldName: "document_type", value: "Second", confidence: 0.9, reasoning: "b" },
    ]);

    await runExtraction(
      { recordingNumber: "20210057847" },
      emit,
      {
        fetchPdf: async () => ({ bytes: fakePdf, contentType: "application/pdf" }),
        anthropic,
        now: () => 0,
      },
    );

    const fields = events.filter((e) => e.type === "field");
    expect(fields).toHaveLength(1);
    if (fields[0].type === "field") {
      expect(fields[0].value).toBe("First");
    }
  });

  it("ignores non-tool-use content blocks", async () => {
    const { emit, events } = makeEmitter();
    const fakePdf = new Uint8Array([0x25]);

    const anthropic: AnthropicLike = {
      messages: {
        stream() {
          const iter = (async function* () {
            yield { type: "message_start", message: {} };
            yield {
              type: "content_block_start",
              index: 0,
              content_block: { type: "text", text: "" },
            };
            yield {
              type: "content_block_delta",
              index: 0,
              delta: { type: "text_delta", text: "chatty preamble" },
            };
            yield { type: "content_block_stop", index: 0 };
            yield { type: "message_stop" };
          })();
          (iter as unknown as { finalMessage: () => Promise<unknown> }).finalMessage = async () => ({
            content: [{ type: "text", text: "chatty preamble" }],
            usage: { input_tokens: 50, output_tokens: 5 },
          });
          return iter as ReturnType<AnthropicLike["messages"]["stream"]>;
        },
      },
    };

    await runExtraction(
      { recordingNumber: "20210057847" },
      emit,
      {
        fetchPdf: async () => ({ bytes: fakePdf, contentType: "application/pdf" }),
        anthropic,
        now: () => 0,
      },
    );

    expect(events.filter((e) => e.type === "field")).toHaveLength(0);
    expect(events[events.length - 1].type).toBe("done");
  });

  it("skips tool_use blocks with an unknown field_name", async () => {
    const { emit, events } = makeEmitter();
    const fakePdf = new Uint8Array([0x25]);
    const anthropic = makeFakeAnthropic([
      { fieldName: "banana", value: 42, confidence: 0.99, reasoning: "nope" },
      { fieldName: "document_type", value: "Warranty Deed", confidence: 0.95, reasoning: "ok" },
    ]);

    await runExtraction(
      { recordingNumber: "20210057847" },
      emit,
      {
        fetchPdf: async () => ({ bytes: fakePdf, contentType: "application/pdf" }),
        anthropic,
        now: () => 0,
      },
    );

    const fields = events.filter((e) => e.type === "field");
    expect(fields).toHaveLength(1);
    if (fields[0].type === "field") {
      expect(fields[0].field_name).toBe("document_type");
    }
  });
});

describe("runExtraction determinism", () => {
  it("produces the same event sequence for the same inputs (types + values)", async () => {
    const fakePdf = new Uint8Array([0x25]);
    const specs: ToolUseSpec[] = [
      { fieldName: "document_type", value: "Warranty Deed", confidence: 0.95, reasoning: "r" },
      { fieldName: "recording_date", value: "2021-01-19", confidence: 0.98, reasoning: "r" },
    ];

    const runOnce = async () => {
      const { emit, events } = makeEmitter();
      await runExtraction(
        { recordingNumber: "20210057847" },
        emit,
        {
          fetchPdf: async () => ({ bytes: fakePdf, contentType: "application/pdf" }),
          anthropic: makeFakeAnthropic(specs),
          now: () => 123,
        },
      );
      return events;
    };

    const a = await runOnce();
    const b = await runOnce();
    // `started_at` is a wall-clock ISO string and will vary run-to-run.
    // Strip it before comparing — everything else must be identical.
    const strip = (events: LiveExtractStreamEvent[]) =>
      events.map((e) =>
        e.type === "meta"
          ? { ...e, started_at: "<dynamic>" }
          : e,
      );
    expect(strip(a)).toEqual(strip(b));
  });
});

// Sanity check — the real fetch function is not invoked in any test,
// but we verify the default path exists and is wired to global fetch.
describe("default fetch wiring", () => {
  it("is invoked when fetchPdf is omitted", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
          status: 200,
          headers: { "content-type": "application/pdf" },
        }),
      );
    const { emit, events } = makeEmitter();
    await runExtraction(
      { recordingNumber: "20210057847" },
      emit,
      { anthropic: makeFakeAnthropic([]), now: () => 0 },
    );
    expect(fetchSpy).toHaveBeenCalled();
    const meta = events.find((e) => e.type === "meta");
    expect(meta).toBeDefined();
    fetchSpy.mockRestore();
  });
});
