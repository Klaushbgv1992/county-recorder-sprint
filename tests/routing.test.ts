import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { loadAllParcels } from "../src/data-loader";
import {
  redirectTargetForInstrument,
  resolveInstrumentToApn,
} from "../src/router-helpers";
import { routes } from "../src/router";
import { TerminologyProvider } from "../src/terminology/TerminologyContext";

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
  return renderToString(
    createElement(TerminologyProvider, null, createElement(RouterProvider, { router })),
  );
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
  it("/ matches the landing page (LandingPage is a direct child of RootLayout, outside AppShell)", () => {
    // The root route renders LandingPage as a child of the path-less RootLayout
    // wrapper. Verify it does NOT match any of the named working-view routes
    // (chain, encumbrance, etc.) — those live inside the AppShell layer.
    const router = createMemoryRouter(routes, { initialEntries: ["/"] });
    const matches = router.state.matches;
    // 2 segments: path-less RootLayout + the "/" LandingPage route
    expect(matches).toHaveLength(2);
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

  it("/why matches the why-page route", () => {
    expect(matchIds("/why")).toContain("why-page");
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

describe("/why integration via full router", () => {
  it("renders WhyPage H1 and the sitewide banner link together", () => {
    const html = renderAt("/why");
    // WhyPage's H1
    expect(html).toContain("Why county-owned title data");
    // Banner's link to /pipeline — proves RootLayout is in the wrap
    expect(html).toContain("See pipeline");
  });

  it("renders the sitewide banner on /staff too (consistent brand/chrome)", () => {
    const html = renderAt("/staff");
    // RootLayout now mounts AppHeader + PipelineBanner on every route,
    // so the clickable brand link back to / is available everywhere.
    expect(html).toContain("See pipeline");
  });
});

describe("wildcard not-found: smart messaging by context", () => {
  // When a URL like /parcel/304-78-386/foobar hits the AppShell "*" wildcard,
  // the default "This parcel or instrument is not in the curated demo corpus"
  // message is inaccurate — POPHAM IS in the corpus; only the subpath is
  // bad. The smart variant tells the user what's actually wrong and how to
  // recover. See findings report 2026-04-16, Bug 2.
  it("unknown subpath under a known parcel names the parcel and offers Chain + Encumbrance links", () => {
    const html = renderAt("/parcel/304-78-386/foobar");
    expect(html).toContain("304-78-386");
    expect(html).toMatch(/not a valid section/i);
    expect(html).toContain("/parcel/304-78-386");
    expect(html).toContain("/parcel/304-78-386/encumbrances");
  });

  it("completely unknown path still falls back to the generic not-in-corpus message", () => {
    const html = renderAt("/totally/bogus/path");
    expect(html).toContain("This parcel or instrument is not in the curated demo corpus");
  });

  it("unknown subpath under an unknown parcel falls back to generic message", () => {
    const html = renderAt("/parcel/nope-nope-nope/foobar");
    // The parent ParcelGuard already catches unknown APNs with its own
    // "Parcel not in this corpus" panel; this test asserts the wildcard
    // doesn't contradict or double-render.
    expect(html).not.toMatch(/not a valid section/i);
  });
});

describe("Chain of title: sparse-corpus explainer", () => {
  // HOGUE (304-77-689) has one curated deed and one DOT — its chain view is
  // intentionally thin to narrate the counter-example. Without an inline
  // explainer the page reads as "something didn't load"; with one it reads
  // as "the county is honest about what it recorded." See findings report
  // 2026-04-16, Bug 1. The note must NOT render on POPHAM (which has a
  // richer chain) to avoid implying POPHAM is also sparse.
  it("HOGUE chain renders the sparse-by-design explainer", () => {
    const html = renderAt("/parcel/304-77-689");
    expect(html).toContain("Sparse by design");
  });

  it("POPHAM chain does NOT render the sparse-by-design explainer", () => {
    const html = renderAt("/parcel/304-78-386");
    expect(html).not.toContain("Sparse by design");
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
