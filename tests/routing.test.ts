import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { loadAllParcels } from "../src/data-loader";
import {
  redirectTargetForInstrument,
  resolveInstrumentToApn,
  routes,
} from "../src/router";

function renderAt(url: string): string {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  return renderToString(createElement(RouterProvider, { router }));
}

function matchIds(url: string): string[] {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  return router.state.matches
    .map((m) => m.route.id)
    .filter((id): id is string => typeof id === "string");
}

function matchParams(url: string): Record<string, string | undefined> {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  const last = router.state.matches[router.state.matches.length - 1];
  return last.params;
}

describe("resolveInstrumentToApn", () => {
  const parcels = loadAllParcels();

  it("returns the owning APN for a known 11-digit instrument", () => {
    // 20210075858 is the POPHAM 2021 reconveyance, on parcel 304-78-386
    expect(resolveInstrumentToApn("20210075858", parcels)).toBe("304-78-386");
  });

  it("returns the owning APN for a HOGUE instrument", () => {
    // 20150516729 is the HOGUE 2015 warranty deed, on parcel 304-77-689
    expect(resolveInstrumentToApn("20150516729", parcels)).toBe("304-77-689");
  });

  it("returns null for an 11-digit instrument not in the corpus", () => {
    expect(resolveInstrumentToApn("99999999999", parcels)).toBeNull();
  });

  it("returns null for a non-11-digit input", () => {
    expect(resolveInstrumentToApn("not-a-number", parcels)).toBeNull();
  });
});

describe("route table", () => {
  it("/ matches the search route", () => {
    expect(matchIds("/")).toContain("search");
  });

  it("/parcel/:apn matches the chain route", () => {
    expect(matchIds("/parcel/304-78-386")).toContain("chain");
    expect(matchParams("/parcel/304-78-386")).toEqual({ apn: "304-78-386" });
  });

  it("/parcel/:apn/instrument/:instrumentNumber matches chain-with-instrument", () => {
    expect(matchIds("/parcel/304-78-386/instrument/20210075858")).toContain(
      "chain-instrument",
    );
    expect(matchParams("/parcel/304-78-386/instrument/20210075858")).toEqual({
      apn: "304-78-386",
      instrumentNumber: "20210075858",
    });
  });

  it("/parcel/:apn/encumbrances matches the encumbrance route", () => {
    expect(matchIds("/parcel/304-78-386/encumbrances")).toContain(
      "encumbrance",
    );
    expect(matchParams("/parcel/304-78-386/encumbrances")).toEqual({
      apn: "304-78-386",
    });
  });

  it("/parcel/:apn/encumbrances/instrument/:n matches encumbrance-with-instrument", () => {
    expect(
      matchIds("/parcel/304-78-386/encumbrances/instrument/20210075858"),
    ).toContain("encumbrance-instrument");
    expect(
      matchParams("/parcel/304-78-386/encumbrances/instrument/20210075858"),
    ).toEqual({ apn: "304-78-386", instrumentNumber: "20210075858" });
  });

  it("/instrument/:n matches the resolver route", () => {
    expect(matchIds("/instrument/20210075858")).toContain(
      "instrument-resolver",
    );
    expect(matchParams("/instrument/20210075858")).toEqual({
      instrumentNumber: "20210075858",
    });
  });

  it("unknown paths match the not-found route", () => {
    expect(matchIds("/totally/bogus/path")).toContain("not-found");
  });
});

describe("redirectTargetForInstrument", () => {
  const parcels = loadAllParcels();

  it("returns the parcel+instrument URL for a known instrument", () => {
    expect(redirectTargetForInstrument("20210075858", parcels)).toBe(
      "/parcel/304-78-386/instrument/20210075858",
    );
  });

  it("returns null for an unknown instrument", () => {
    expect(redirectTargetForInstrument("99999999999", parcels)).toBeNull();
  });
});

describe("NotFound rendering", () => {
  it("unknown APN renders the parcel-not-found panel", () => {
    const html = renderAt("/parcel/nope-nope-nope");
    expect(html).toContain("Parcel not in this corpus");
    expect(html).toContain("Return to search");
  });

  it("known APN + unknown instrument renders chain in main pane and not-found in drawer", () => {
    const html = renderAt("/parcel/304-78-386/instrument/99999999999");
    // Chain still rendered in the main pane (parcel address proves the
    // chain panel loaded, not the parcel-guard fallback).
    expect(html).toContain("3674 E Palmer St");
    // Drawer slot shows the not-found panel for the missing instrument.
    expect(html).toContain("Instrument not on this parcel");
    expect(html).toContain("99999999999");
  });

  it("/instrument/:n unknown renders the instrument-not-found panel", () => {
    const html = renderAt("/instrument/99999999999");
    expect(html).toContain("Instrument not in this corpus");
  });

  it("/instrument/:n known initial render shows resolving placeholder", () => {
    // Before the redirect effect fires (static render never runs
    // effects), the resolver component shows the placeholder. This
    // asserts the "one-frame flash" copy exists and is plain text.
    const html = renderAt("/instrument/20210075858");
    expect(html).toContain("Resolving instrument…");
  });
});
