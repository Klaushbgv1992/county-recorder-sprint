// DOM tests asserting ProofDrawer renders the amber "synthetic · demo-only"
// pill in the header whenever the instrument carries
// `raw_api_response.synthesized === true`, and does NOT render it on a real
// instrument. The pill is the demo's credibility firewall — a viewer must
// never mistake a synthetic instrument for a real recorded doc.
//
// Convention: jsdom env, @testing-library/jest-dom/vitest, afterEach(cleanup).
// Mounts ProofDrawer with real curated data via loadParcelDataByApn, same
// shape the router uses in src/router.tsx.

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { ProofDrawer } from "../src/components/ProofDrawer";
import { loadParcelDataByApn } from "../src/data-loader";
import { TerminologyProvider } from "../src/terminology/TerminologyContext";
import { AuthProvider } from "../src/account/AuthContext";
import { ToastProvider } from "../src/components/ui/Toast";
import type { Instrument } from "../src/types";

type SyntheticCase = { recordingNumber: string; apn: string; label: string };

// Each synthetic instrument carries raw_api_response.synthesized === true
// and parties[].provenance === "demo_synthetic". Its owning APN is the
// single parcel whose curated instrument_numbers list includes it.
const SYNTHETIC_CASES: SyntheticCase[] = [
  { recordingNumber: "20190100001", apn: "304-78-374", label: "WARNER junior HELOC" },
  { recordingNumber: "20220100001", apn: "304-78-367", label: "PHOENIX LLC→member Q/CL" },
  { recordingNumber: "20230100000", apn: "304-78-367", label: "PHOENIX HOA lien" },
];

// POPHAM 20210075858 — REL D/T, real recorded instrument, provenance:
// ocr / manual_entry / public_api. No synthesized flag. Control case.
const REAL_POPHAM_RELEASE = { recordingNumber: "20210075858", apn: "304-78-386" };

function renderDrawerForInstrument(apn: string, recordingNumber: string) {
  const data = loadParcelDataByApn(apn);
  const instrument: Instrument | undefined = data.instruments.find(
    (i) => i.instrument_number === recordingNumber,
  );
  if (!instrument) {
    throw new Error(
      `Instrument ${recordingNumber} not found on parcel ${apn} — fixture drift`,
    );
  }
  const linksForDrawer = data.links.filter(
    (l) =>
      l.source_instrument === recordingNumber ||
      l.target_instrument === recordingNumber,
  );
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
        <TerminologyProvider>
          <ProofDrawer
            instrument={instrument}
            links={linksForDrawer}
            corpusProvenance={{ public_api: 22, ocr: 35, manual_entry: 18 }}
            onClose={() => {}}
            parcel={data.parcel}
            allInstruments={data.instruments}
            allLinks={data.links}
            lifecycles={data.lifecycles}
            pipelineStatus={data.pipelineStatus}
          />
        </TerminologyProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

// The header pill text is "synthetic · demo-only" (middle dot is U+00B7).
// Allow any whitespace/separator between the two tokens to survive minor
// copy edits without breaking the test intent.
const PILL_TEXT_RE = /synthetic\s*[·•|/-]?\s*demo[\s-]*only/i;

describe("ProofDrawer — synthetic · demo-only pill", () => {
  afterEach(() => cleanup());

  for (const c of SYNTHETIC_CASES) {
    it(`renders pill in header for ${c.recordingNumber} (${c.label})`, () => {
      const { container } = renderDrawerForInstrument(c.apn, c.recordingNumber);

      // Locate the header section — the mono recording number is in the
      // drawer header and the pill is its sibling <span>.
      const headerHeading = screen.getByRole("heading", {
        name: c.recordingNumber,
      });
      const header = headerHeading.parentElement as HTMLElement;
      expect(header).not.toBeNull();

      // Pill renders next to the recording number.
      const pill = within(header).getByText(PILL_TEXT_RE);
      expect(pill).toBeInTheDocument();
      // Amber palette — same family as the AiSummaryStatic banner.
      expect(pill.className).toMatch(/amber/);
      // title tooltip explains the flag in plain language.
      expect(pill.getAttribute("title")).toMatch(/synth|demo/i);

      // Sanity: pill appears exactly once in the full drawer (no duplicate
      // from an unrelated surface).
      const allMatches = within(container).getAllByText(PILL_TEXT_RE);
      expect(allMatches).toHaveLength(1);
    });
  }

  it(`does NOT render pill for real instrument ${REAL_POPHAM_RELEASE.recordingNumber} (POPHAM release)`, () => {
    const { container } = renderDrawerForInstrument(
      REAL_POPHAM_RELEASE.apn,
      REAL_POPHAM_RELEASE.recordingNumber,
    );
    // Header still renders with the recording number…
    expect(
      screen.getByRole("heading", { name: REAL_POPHAM_RELEASE.recordingNumber }),
    ).toBeInTheDocument();
    // …but no synthetic pill anywhere in the drawer.
    expect(within(container).queryByText(PILL_TEXT_RE)).toBeNull();
  });
});
