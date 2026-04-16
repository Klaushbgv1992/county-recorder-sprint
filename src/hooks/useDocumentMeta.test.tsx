import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useDocumentMeta, type DocumentMetaInput } from "./useDocumentMeta";

function Probe(props: DocumentMetaInput) {
  useDocumentMeta(props);
  return null;
}

function metaFor(name: string): string | null {
  return (
    document.head
      .querySelector<HTMLMetaElement>(
        `meta[data-managed="useDocumentMeta"][name="${name}"], meta[data-managed="useDocumentMeta"][property="${name}"]`,
      )
      ?.content ?? null
  );
}

function jsonLd(): unknown | null {
  const el = document.head.querySelector<HTMLScriptElement>(
    'script[data-managed="useDocumentMeta"][type="application/ld+json"]',
  );
  return el ? JSON.parse(el.textContent ?? "null") : null;
}

describe("useDocumentMeta", () => {
  beforeEach(() => {
    document.title = "";
    document.head
      .querySelectorAll('[data-managed="useDocumentMeta"]')
      .forEach((n) => n.remove());
  });
  afterEach(() => cleanup());

  it("sets document.title", () => {
    render(<Probe title="Hello" description="d" />);
    expect(document.title).toBe("Hello");
  });

  it("sets description, og:title, og:description, twitter:title", () => {
    render(
      <Probe
        title="Parcel 304-78-386"
        description="Chain of title for POPHAM"
        ogImage="/og.png"
      />,
    );
    expect(metaFor("description")).toBe("Chain of title for POPHAM");
    expect(metaFor("og:title")).toBe("Parcel 304-78-386");
    expect(metaFor("og:description")).toBe("Chain of title for POPHAM");
    expect(metaFor("og:image")).toBe("/og.png");
    expect(metaFor("twitter:title")).toBe("Parcel 304-78-386");
  });

  it("inserts JSON-LD when provided", () => {
    render(
      <Probe
        title="t"
        description="d"
        jsonLd={{ "@context": "https://schema.org", "@type": "Place", name: "Parcel" }}
      />,
    );
    const ld = jsonLd() as Record<string, unknown> | null;
    expect(ld).not.toBeNull();
    expect(ld!["@type"]).toBe("Place");
  });

  it("removes managed elements on unmount", () => {
    const { unmount } = render(
      <Probe title="t" description="d" jsonLd={{ x: 1 }} />,
    );
    expect(metaFor("description")).toBe("d");
    unmount();
    expect(
      document.head.querySelectorAll('[data-managed="useDocumentMeta"]').length,
    ).toBe(0);
  });

  it("updates managed elements when props change (no duplicates)", () => {
    const { rerender } = render(<Probe title="A" description="da" />);
    expect(metaFor("og:title")).toBe("A");
    rerender(<Probe title="B" description="db" />);
    expect(metaFor("og:title")).toBe("B");
    expect(
      document.head.querySelectorAll(
        'meta[data-managed="useDocumentMeta"][property="og:title"]',
      ).length,
    ).toBe(1);
  });
});
