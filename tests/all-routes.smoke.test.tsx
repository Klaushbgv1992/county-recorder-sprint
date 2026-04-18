import { describe, it, expect, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../src/router";
import { TerminologyProvider } from "../src/terminology/TerminologyContext";

const PATHS: Array<{ path: string; expectText: RegExp; note?: string }> = [
  { path: "/", expectText: /county/i, note: "landing" },
  { path: "/?mode=homeowner", expectText: /what does the county know/i, note: "homeowner hero" },
  { path: "/?mode=examiner", expectText: /grantor|party|instrument/i, note: "examiner hero" },
  { path: "/county-activity", expectText: /activity|recorder|county/i },
  { path: "/why", expectText: /why county-owned/i },
  { path: "/enterprise", expectText: /license the county's data/i },
  { path: "/moat-compare", expectText: /plant|county/i },
  { path: "/api", expectText: /api|endpoint/i },
  { path: "/pipeline", expectText: /pipeline|verified|stage/i },
  { path: "/staff", expectText: /staff|workbench/i },

  // parcel-scoped routes
  { path: "/parcel/304-78-386", expectText: /popham|palmer|chain/i, note: "chain POPHAM" },
  { path: "/parcel/304-78-386/home", expectText: /3674 E Palmer St/i, note: "homeowner card" },
  { path: "/parcel/304-78-386/encumbrances", expectText: /encumbrance|mortgage|lien/i },
  { path: "/parcel/304-78-386/story", expectText: /palmer|pophams|in gilbert/i },
  { path: "/parcel/304-77-689", expectText: /hogue|palmer/i, note: "chain HOGUE" },
  { path: "/parcel/304-77-689/home", expectText: /2715 E Palmer St/i, note: "homeowner card HOGUE" },

  // instrument resolver — client-side redirect
  { path: "/instrument/20130183449", expectText: /resolving|popham|palmer|chain/i },

  // party page
  { path: "/party/christopher-popham", expectText: /popham/i },

  // unknown → catch-all
  { path: "/this-route-does-not-exist", expectText: /not in|corpus|home|back/i },
];

describe("all routes smoke — every route renders without throwing", () => {
  afterEach(() => cleanup());

  for (const p of PATHS) {
    it(`${p.path}${p.note ? ` — ${p.note}` : ""}`, async () => {
      const router = createMemoryRouter(routes, { initialEntries: [p.path] });
      const { container } = render(
        <TerminologyProvider>
          <RouterProvider router={router} />
        </TerminologyProvider>,
      );

      // Give dynamic imports / resolver redirects one tick to settle.
      await waitFor(() => {
        expect(container.textContent ?? "").toMatch(p.expectText);
      }, { timeout: 2000 });

      // Also assert no React error boundary surface text.
      expect(container.textContent ?? "").not.toMatch(/something went wrong/i);
    });
  }
});
