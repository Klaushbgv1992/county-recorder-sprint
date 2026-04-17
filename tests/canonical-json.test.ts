import { describe, it, expect } from "vitest";
import { canonicalJson, promptHash } from "../scripts/lib/canonical-json";

describe("canonicalJson", () => {
  it("produces byte-identical output regardless of input key order", () => {
    const a = { b: 2, a: 1, c: { y: 20, x: 10 } };
    const b = { a: 1, c: { x: 10, y: 20 }, b: 2 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });

  it("handles arrays preserving index order (not sorted)", () => {
    expect(canonicalJson([3, 1, 2])).toBe("[3,1,2]");
  });

  it("serializes nested objects with sorted keys recursively", () => {
    expect(canonicalJson({ z: { d: 1, a: 2 }, a: [1, 2] })).toBe(
      '{"a":[1,2],"z":{"a":2,"d":1}}',
    );
  });
});

describe("promptHash", () => {
  it("is stable across key-order variation of the same inputs", () => {
    const a = promptHash({ b: [1, 2], a: { y: "x", x: "y" } });
    const b = promptHash({ a: { x: "y", y: "x" }, b: [1, 2] });
    expect(a).toBe(b);
  });

  it("differs when a value actually changes", () => {
    const a = promptHash({ x: 1 });
    const b = promptHash({ x: 2 });
    expect(a).not.toBe(b);
  });

  it("is a hex sha256 (64 chars)", () => {
    expect(promptHash({ x: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });
});
