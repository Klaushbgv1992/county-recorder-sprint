import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { loadAllParcels } from "../src/data-loader";
import {
  redirectTargetForInstrument,
  resolveInstrumentToApn,
  routes,
} from "../src/router";

// LandingPage (now at /) renders CountyMap which uses react-map-gl/maplibre.
// MapLibre requires WebGL which is unavailable in jsdom. Mock the module so
// renderToString on "/" doesn't throw.
vi.mock("react-map-gl/maplibre", () => ({
  default: () => null,
  Source: () => null,
  Layer: () => null,
  Marker: () => null,
}));

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
  it("/ matches the landing page (LandingPage is outside AppShell)", () => {
    // The root route renders LandingPage directly.
    // Verify it matches exactly one route segment and does NOT match any
    // of the named working-view routes (chain, encumbrance, etc.).
    const router = createMemoryRouter(routes, { initialEntries: ["/"] });
    const matches = router.state.matches;
    expect(matches).toHaveLength(1);
    const namedIds = matches
      .map((m) => m.route.id)
      .filter((id): id is string => typeof id === "string");
    expect(namedIds).not.toContain("chain");
    expect(namedIds).not.toContain("encumbrance");
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

  it("/moat-compare matches the moat-compare route", () => {
    expect(matchIds("/moat-compare")).toContain("moat-compare");
  });

  it("matches /county-activity", () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/county-activity"] });
    const matches = router.state.matches;
    const ids = matches.map((m) => m.route.id).filter((id): id is string => typeof id === "string");
    expect(ids).not.toContain("not-found");
  });

  it("/parcel/:apn/commitment/new matches the commitment-new route", () => {
    expect(matchIds("/parcel/304-78-386/commitment/new")).toContain(
      "commitment-new",
    );
    expect(matchParams("/parcel/304-78-386/commitment/new")).toEqual({
      apn: "304-78-386",
    });
  });

  it("matches /pipeline", () => {
    expect(matchIds("/pipeline")).toContain("pipeline");
  });

  it("matches /staff", () => {
    expect(matchIds("/staff")).toContain("staff");
  });

  it("matches /staff/search", () => {
    expect(matchIds("/staff/search")).toContain("staff-search");
  });

  it("matches /staff/queue", () => {
    expect(matchIds("/staff/queue")).toContain("staff-queue");
  });

  it("matches /staff/parcel/:apn", () => {
    expect(matchIds("/staff/parcel/304-78-386")).toContain("staff-parcel");
    expect(matchParams("/staff/parcel/304-78-386")).toEqual({
      apn: "304-78-386",
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
    expect(html).toContain("Back to search");
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

describe("AppShell smoke render", () => {
  // Pure renderToString is one-shot; it cannot trip React's hook-order
  // diagnostic (which needs a re-render) and therefore cannot reproduce
  // issue: 'parcels.some null crash on /parcel/:apn navigation'. This suite
  // is a narrower guard: AppShell renders the authoritative URLs without
  // throwing, locking in the null-safe boolean derivations in App.tsx.
  const urls = [
    "/",
    "/parcel/304-78-386",
    "/parcel/304-78-386/encumbrances",
    "/parcel/304-77-689",
    "/parcel/304-77-689/encumbrances",
  ];
  for (const url of urls) {
    it(`${url} renders without throwing`, () => {
      expect(() => renderAt(url)).not.toThrow();
    });
  }
});
