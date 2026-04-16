import { useEffect } from "react";

export interface DocumentMetaInput {
  title: string;
  description: string;
  ogImage?: string;
  ogUrl?: string;
  jsonLd?: unknown;
}

const DATA_MARKER = "useDocumentMeta";

function upsertMeta(
  selectorAttr: "name" | "property",
  key: string,
  content: string,
): void {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[data-managed="${DATA_MARKER}"][${selectorAttr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(selectorAttr, key);
    el.setAttribute("data-managed", DATA_MARKER);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertJsonLd(payload: unknown): void {
  let el = document.head.querySelector<HTMLScriptElement>(
    `script[data-managed="${DATA_MARKER}"][type="application/ld+json"]`,
  );
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-managed", DATA_MARKER);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(payload);
}

function removeJsonLd(): void {
  document.head
    .querySelector(
      `script[data-managed="${DATA_MARKER}"][type="application/ld+json"]`,
    )
    ?.remove();
}

function removeAllManaged(): void {
  document.head
    .querySelectorAll(`[data-managed="${DATA_MARKER}"]`)
    .forEach((n) => n.remove());
}

export function useDocumentMeta(input: DocumentMetaInput): void {
  useEffect(() => {
    document.title = input.title;
    upsertMeta("name", "description", input.description);
    upsertMeta("property", "og:title", input.title);
    upsertMeta("property", "og:description", input.description);
    upsertMeta("property", "og:type", "website");
    if (input.ogImage) upsertMeta("property", "og:image", input.ogImage);
    if (input.ogUrl) upsertMeta("property", "og:url", input.ogUrl);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", input.title);
    upsertMeta("name", "twitter:description", input.description);
    if (input.ogImage) upsertMeta("name", "twitter:image", input.ogImage);

    if (input.jsonLd !== undefined) {
      upsertJsonLd(input.jsonLd);
    } else {
      removeJsonLd();
    }

    return removeAllManaged;
  }, [
    input.title,
    input.description,
    input.ogImage,
    input.ogUrl,
    input.jsonLd,
  ]);
}
