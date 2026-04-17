// tests/parcel-drawer.dom.test.tsx
//
// DOM tests for ParcelDrawer + exported popup sub-components.
// Convention: jsdom env, @testing-library/jest-dom/vitest, afterEach(cleanup).

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";

import {
  ParcelDrawer,
  CachedNeighborPopup,
  AssessorOnlyPopup,
} from "../src/components/ParcelDrawer";
import type { ParcelDrawerProps, RecentInstrument } from "../src/components/ParcelDrawer";
import type { Parcel } from "../src/types";
import type { AssessorParcel } from "../src/logic/assessor-parcel";

// ---------------------------------------------------------------------------
// Mock react-map-gl/maplibre (Popup)
// ---------------------------------------------------------------------------
vi.mock("react-map-gl/maplibre", () => ({
  Popup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PARCEL_FIXTURE: Parcel = {
  apn: "304-78-386",
  address: "3674 E Palmer St",
  city: "Gilbert",
  state: "AZ",
  zip: "85234",
  legal_description: "LOT 46, SEVILLE PARCEL 3, BOOK 554 MAPS PAGE 19",
  current_owner: "POPHAM CHRISTOPHER / ASHLEY",
  subdivision: "SEVILLE PARCEL 3",
  instrument_numbers: ["20130183450", "20210075857"],
};

const ASSESSOR_FIXTURE: AssessorParcel = {
  apn: "304-77-999",
  OWNER_NAME: "SMITH JOHN",
  situs_street: "100 E Test St",
  situs_city: "Gilbert",
  situs_state: "AZ",
  situs_zip: "85233",
  cached_date: "2026-04-09",
};

const RECENT_INSTRUMENTS: RecentInstrument[] = [
  {
    recording_number: "20210075857",
    recording_date: "2021-03-18",
    doc_type: "DEED OF TRUST",
    parties: ["POPHAM CHRISTOPHER", "VIP MORTGAGE"],
  },
  {
    recording_number: "20210075858",
    recording_date: "2021-03-21",
    doc_type: "DEED OF RELEASE & FULL RECONVEYANCE OF D/TR",
    parties: ["WELLS FARGO", "POPHAM CHRISTOPHER"],
  },
];

const SEEDED_COUNT = 1234;

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function renderDrawer(props: Partial<ParcelDrawerProps> & { variant: ParcelDrawerProps["variant"] }) {
  const defaults: ParcelDrawerProps = {
    variant: props.variant,
    payload: props.payload ?? null,
    onClose: props.onClose ?? vi.fn(),
    seededCount: props.seededCount ?? SEEDED_COUNT,
    isMobile: props.isMobile ?? false,
  };
  return render(
    <MemoryRouter>
      <ParcelDrawer {...defaults} />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// 1. Curated variant
// ---------------------------------------------------------------------------

describe("ParcelDrawer — curated variant", () => {
  afterEach(() => cleanup());

  it("renders 'Open chain of title' CTA linking to /parcel/:apn", () => {
    renderDrawer({
      variant: "curated",
      payload: { parcel: PARCEL_FIXTURE },
    });
    const link = screen.getByRole("link", { name: /Open chain of title/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/parcel/304-78-386");
  });

  it("renders 'Open encumbrances' CTA linking to /parcel/:apn/encumbrances", () => {
    renderDrawer({
      variant: "curated",
      payload: { parcel: PARCEL_FIXTURE },
    });
    const link = screen.getByRole("link", { name: /Open encumbrances/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/parcel/304-78-386/encumbrances");
  });

  it("renders the owner name", () => {
    renderDrawer({
      variant: "curated",
      payload: { parcel: PARCEL_FIXTURE },
    });
    expect(screen.getByText("POPHAM CHRISTOPHER / ASHLEY")).toBeInTheDocument();
  });

  it("renders the APN", () => {
    renderDrawer({
      variant: "curated",
      payload: { parcel: PARCEL_FIXTURE },
    });
    expect(screen.getByText("304-78-386")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Recorder-cached variant
// ---------------------------------------------------------------------------

describe("ParcelDrawer — recorder_cached variant", () => {
  afterEach(() => cleanup());

  it("renders 'Last N recorded instruments' section header", () => {
    renderDrawer({
      variant: "recorder_cached",
      payload: {
        polygon: ASSESSOR_FIXTURE,
        lastRecordedDate: "2021-03-21",
        lastDocType: "DEED OF TRUST",
        recent_instruments: RECENT_INSTRUMENTS,
      },
    });
    expect(
      screen.getByText(/Last 2 recorded instruments/i),
    ).toBeInTheDocument();
  });

  it("renders provenance pills for each instrument", () => {
    renderDrawer({
      variant: "recorder_cached",
      payload: {
        polygon: ASSESSOR_FIXTURE,
        lastRecordedDate: "2021-03-21",
        lastDocType: "DEED OF TRUST",
        recent_instruments: RECENT_INSTRUMENTS,
      },
    });
    const pills = screen.getAllByText(/Maricopa Recorder · cached/i);
    expect(pills.length).toBeGreaterThanOrEqual(2);
  });

  it("renders POPHAM CTA linking to /parcel/304-78-386", () => {
    renderDrawer({
      variant: "recorder_cached",
      payload: {
        polygon: ASSESSOR_FIXTURE,
        lastRecordedDate: "2021-03-21",
        lastDocType: "DEED OF TRUST",
        recent_instruments: RECENT_INSTRUMENTS,
      },
    });
    const link = screen.getByRole("link", { name: /POPHAM/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/parcel/304-78-386");
  });

  it("renders 'browse all 5 curated parcels' CTA", () => {
    renderDrawer({
      variant: "recorder_cached",
      payload: {
        polygon: ASSESSOR_FIXTURE,
        lastRecordedDate: "2021-03-21",
        lastDocType: "DEED OF TRUST",
        recent_instruments: RECENT_INSTRUMENTS,
      },
    });
    expect(
      screen.getByText(/browse all 5 curated parcels/i),
    ).toBeInTheDocument();
  });

  it("renders the 'not curated in this demo' disclaimer", () => {
    renderDrawer({
      variant: "recorder_cached",
      payload: {
        polygon: ASSESSOR_FIXTURE,
        lastRecordedDate: "2021-03-21",
        lastDocType: "DEED OF TRUST",
        recent_instruments: RECENT_INSTRUMENTS,
      },
    });
    expect(
      screen.getByText(/indexed but not curated in this demo/i),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Assessor-only variant
// ---------------------------------------------------------------------------

describe("ParcelDrawer — assessor_only variant", () => {
  afterEach(() => cleanup());

  it("omits 'Open chain of title' CTA", () => {
    renderDrawer({
      variant: "assessor_only",
      payload: { polygon: ASSESSOR_FIXTURE },
    });
    expect(
      screen.queryByRole("link", { name: /Open chain of title/i }),
    ).not.toBeInTheDocument();
  });

  it("renders an honest disclaimer about assessor-only data", () => {
    renderDrawer({
      variant: "assessor_only",
      payload: { polygon: ASSESSOR_FIXTURE },
    });
    expect(
      screen.getByText(/assessor data only/i),
    ).toBeInTheDocument();
  });

  it("renders provenance pills for assessor fields", () => {
    renderDrawer({
      variant: "assessor_only",
      payload: { polygon: ASSESSOR_FIXTURE },
    });
    const pills = screen.getAllByText(/Maricopa Assessor · public GIS · cached/i);
    expect(pills.length).toBeGreaterThanOrEqual(1);
  });

  it("renders a muted footnote about county custody", () => {
    renderDrawer({
      variant: "assessor_only",
      payload: { polygon: ASSESSOR_FIXTURE },
    });
    expect(
      screen.getByText(/County-curated data includes/i),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. Not-in-seeded-area variant
// ---------------------------------------------------------------------------

describe("ParcelDrawer — not_in_seeded_area variant", () => {
  afterEach(() => cleanup());

  it("names the seeded count dynamically", () => {
    renderDrawer({
      variant: "not_in_seeded_area",
      payload: null,
      seededCount: 1234,
    });
    expect(screen.getByText(/1,234 parcels captured/i)).toBeInTheDocument();
  });

  it("renders the 'Not in the seeded area' header", () => {
    renderDrawer({
      variant: "not_in_seeded_area",
      payload: null,
    });
    expect(screen.getByText(/Not in the seeded area/i)).toBeInTheDocument();
  });

  it("renders curated parcel links", () => {
    renderDrawer({
      variant: "not_in_seeded_area",
      payload: null,
    });
    const pophamLink = screen.getByRole("link", { name: /304-78-386/i });
    expect(pophamLink).toBeInTheDocument();
    expect(pophamLink).toHaveAttribute("href", "/parcel/304-78-386");
  });
});

// ---------------------------------------------------------------------------
// 5. Desktop Esc dismissal
// ---------------------------------------------------------------------------

describe("ParcelDrawer — desktop Esc dismissal", () => {
  afterEach(() => cleanup());

  it("calls onClose when Escape is pressed on window (desktop)", () => {
    const onClose = vi.fn();
    renderDrawer({
      variant: "not_in_seeded_area",
      payload: null,
      onClose,
      isMobile: false,
    });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Esc when isMobile=true (bottom sheet is a dialog)", () => {
    const onClose = vi.fn();
    renderDrawer({
      variant: "not_in_seeded_area",
      payload: null,
      onClose,
      isMobile: true,
    });
    fireEvent.keyDown(window, { key: "Escape" });
    // The mobile shell switched from full-screen modal (no keyboard handling)
    // to a BottomSheet dialog that follows standard Esc-closes semantics for
    // accessibility. Hardware-back continues to work via the popstate listener
    // exercised in the next test.
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 6. Mobile back-chevron
// ---------------------------------------------------------------------------

describe("ParcelDrawer — mobile back-chevron", () => {
  afterEach(() => cleanup());

  it("renders a 'Back to map' button that calls onClose", () => {
    const onClose = vi.fn();
    renderDrawer({
      variant: "not_in_seeded_area",
      payload: null,
      onClose,
      isMobile: true,
    });
    const btn = screen.getByRole("button", { name: /Back to map/i });
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 7. Mobile popstate
// ---------------------------------------------------------------------------

describe("ParcelDrawer — mobile popstate", () => {
  afterEach(() => cleanup());

  it("calls onClose when a PopStateEvent fires", () => {
    const onClose = vi.fn();
    renderDrawer({
      variant: "not_in_seeded_area",
      payload: null,
      onClose,
      isMobile: true,
    });
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 8. Drawer variant selection (4 scenarios → correct variant renders)
// ---------------------------------------------------------------------------

describe("ParcelDrawer — variant selection", () => {
  afterEach(() => cleanup());

  it("curated variant shows owner name (distinctive text)", () => {
    renderDrawer({
      variant: "curated",
      payload: { parcel: PARCEL_FIXTURE },
    });
    expect(screen.getByText("POPHAM CHRISTOPHER / ASHLEY")).toBeInTheDocument();
  });

  it("recorder_cached variant shows 'indexed but not curated' disclaimer", () => {
    renderDrawer({
      variant: "recorder_cached",
      payload: {
        polygon: ASSESSOR_FIXTURE,
        lastRecordedDate: "2021-03-21",
        lastDocType: "DEED OF TRUST",
        recent_instruments: RECENT_INSTRUMENTS,
      },
    });
    expect(
      screen.getByText(/indexed but not curated in this demo/i),
    ).toBeInTheDocument();
  });

  it("assessor_only variant shows 'assessor data only' disclaimer", () => {
    renderDrawer({
      variant: "assessor_only",
      payload: { polygon: ASSESSOR_FIXTURE },
    });
    expect(screen.getByText(/assessor data only/i)).toBeInTheDocument();
  });

  it("not_in_seeded_area variant shows 'Not in the seeded area' header", () => {
    renderDrawer({
      variant: "not_in_seeded_area",
      payload: null,
    });
    expect(screen.getByText(/Not in the seeded area/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 9. CachedNeighborPopup conditional — null `last` omits "Last:" line
// ---------------------------------------------------------------------------

describe("CachedNeighborPopup", () => {
  afterEach(() => cleanup());

  it("renders 'Last:' line when last is provided", () => {
    render(
      <CachedNeighborPopup
        longitude={-111.7}
        latitude={33.3}
        apn="304-77-999"
        owner="SMITH JOHN"
        last="2021-03-18"
      />,
    );
    expect(screen.getByText(/Last:/i)).toBeInTheDocument();
  });

  it("omits 'Last:' line when last is null", () => {
    render(
      <CachedNeighborPopup
        longitude={-111.7}
        latitude={33.3}
        apn="304-77-999"
        owner="SMITH JOHN"
        last={null}
      />,
    );
    expect(screen.queryByText(/Last:/i)).not.toBeInTheDocument();
  });

  it("renders apn text", () => {
    render(
      <CachedNeighborPopup
        longitude={-111.7}
        latitude={33.3}
        apn="304-77-999"
        owner={null}
        last={null}
      />,
    );
    expect(screen.getByText("304-77-999")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 10. AssessorOnlyPopup conditional — null OWNER_NAME renders "—"
// ---------------------------------------------------------------------------

describe("AssessorOnlyPopup", () => {
  afterEach(() => cleanup());

  it("renders owner name when provided", () => {
    render(
      <AssessorOnlyPopup
        longitude={-111.7}
        latitude={33.3}
        apn="304-77-999"
        ownerName="SMITH JOHN"
      />,
    );
    expect(screen.getByText("SMITH JOHN")).toBeInTheDocument();
  });

  it("renders '—' placeholder when ownerName is null", () => {
    render(
      <AssessorOnlyPopup
        longitude={-111.7}
        latitude={33.3}
        apn="304-77-999"
        ownerName={null}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders apn text", () => {
    render(
      <AssessorOnlyPopup
        longitude={-111.7}
        latitude={33.3}
        apn="304-77-999"
        ownerName={null}
      />,
    );
    expect(screen.getByText("304-77-999")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Bonus: desktop vs mobile shell rendering
// ---------------------------------------------------------------------------

describe("ParcelDrawer — shell role/aria attributes", () => {
  afterEach(() => cleanup());

  it("desktop: aria-modal is false", () => {
    renderDrawer({
      variant: "not_in_seeded_area",
      payload: null,
      isMobile: false,
    });
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "false");
    expect(dialog).toHaveAttribute("aria-label", "Parcel details");
  });

  it("mobile: aria-modal is true", () => {
    renderDrawer({
      variant: "not_in_seeded_area",
      payload: null,
      isMobile: true,
    });
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Parcel details");
  });
});
