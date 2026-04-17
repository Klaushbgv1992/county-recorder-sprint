import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type Anthropic from "@anthropic-ai/sdk";
import { bakeOne } from "../scripts/bake-ai-summaries";
import type { SummaryInput } from "../src/lib/claude-summary";

// Minimal SummaryInput — bakeOne does not introspect fields beyond handing
// the whole object to promptHash + buildUserMessage. A stable shape is
// sufficient for testing the write-order / empty-guard logic.
const MIN_INPUT = {
  parcel: {
    apn: "999-99-999",
    address: "0 Test Way",
    city: "Testville",
    state: "AZ",
    zip: "00000",
    legal_description: "Test legal",
    current_owner: "TEST OWNER",
    type: "residential",
    subdivision: "Test Sub",
    assessor_url: "https://example.invalid",
    instrument_numbers: [],
  },
  instruments: [],
  lifecycles: [],
  findings: [],
} as unknown as SummaryInput;

function makeClient(
  textBlocks: Array<{ type: "text"; text: string }>,
): Anthropic {
  return {
    messages: {
      create: vi.fn(async () => ({
        content: textBlocks,
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
        },
      })),
    },
  } as unknown as Anthropic;
}

describe("bakeOne", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bake-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("throws and writes no artifacts when the response has zero text blocks", async () => {
    const apn = "999-99-001";
    const client = makeClient([]); // empty response — the bug scenario

    await expect(
      bakeOne(client, apn, MIN_INPUT, false, tmpDir),
    ).rejects.toThrow(/no text content/i);

    const outDir = path.join(tmpDir, apn);
    // No directory and certainly no files — no side effects on empty response.
    expect(fs.existsSync(outDir)).toBe(false);
  });

  it("throws and writes no artifacts when the response is whitespace-only", async () => {
    const apn = "999-99-002";
    const client = makeClient([{ type: "text", text: "   \n\t  " }]);

    await expect(
      bakeOne(client, apn, MIN_INPUT, false, tmpDir),
    ).rejects.toThrow(/no text content/i);

    expect(fs.existsSync(path.join(tmpDir, apn))).toBe(false);
  });

  it("writes all three artifacts on a non-empty response, with metadata written last", async () => {
    const apn = "999-99-003";
    const client = makeClient([{ type: "text", text: "## Summary\n\nHello." }]);

    // Track call order of fs.writeFileSync to verify metadata is last.
    const writtenOrder: string[] = [];
    const real = fs.writeFileSync;
    const spy = vi
      .spyOn(fs, "writeFileSync")
      .mockImplementation(((file: fs.PathOrFileDescriptor, ...rest: unknown[]) => {
        writtenOrder.push(String(file));
        // Delegate to the real implementation so files land on disk.
        return (real as unknown as (...a: unknown[]) => void)(file, ...rest);
      }) as typeof fs.writeFileSync);

    try {
      await bakeOne(client, apn, MIN_INPUT, false, tmpDir);
    } finally {
      spy.mockRestore();
    }

    const outDir = path.join(tmpDir, apn);
    const summaryPath = path.join(outDir, "summary.md");
    const promptPath = path.join(outDir, "prompt.txt");
    const metadataPath = path.join(outDir, "metadata.json");

    expect(fs.existsSync(summaryPath)).toBe(true);
    expect(fs.existsSync(promptPath)).toBe(true);
    expect(fs.existsSync(metadataPath)).toBe(true);

    expect(fs.readFileSync(summaryPath, "utf8")).toContain("Hello.");

    const meta = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    expect(meta.model_id).toBe("claude-opus-4-7");
    expect(meta.prompt_hash).toMatch(/^[0-9a-f]{64}$/);

    // Write order: summary.md, prompt.txt, metadata.json.
    const basenames = writtenOrder.map((p) => path.basename(p));
    const summaryIdx = basenames.indexOf("summary.md");
    const promptIdx = basenames.indexOf("prompt.txt");
    const metaIdx = basenames.indexOf("metadata.json");
    expect(summaryIdx).toBeGreaterThanOrEqual(0);
    expect(promptIdx).toBeGreaterThan(summaryIdx);
    expect(metaIdx).toBeGreaterThan(promptIdx);
  });

  it("skips (no artifacts, no API call) when metadata.json hash matches and force=false", async () => {
    const apn = "999-99-004";
    // First run: write metadata so the cache hit path is taken.
    const client1 = makeClient([{ type: "text", text: "first" }]);
    await bakeOne(client1, apn, MIN_INPUT, false, tmpDir);

    // Second run with identical input: the Anthropic client must not be called.
    const client2 = makeClient([{ type: "text", text: "second" }]);
    await bakeOne(client2, apn, MIN_INPUT, false, tmpDir);
    expect(client2.messages.create).not.toHaveBeenCalled();

    // Summary is still from the first bake.
    expect(
      fs.readFileSync(path.join(tmpDir, apn, "summary.md"), "utf8"),
    ).toBe("first");
  });
});
