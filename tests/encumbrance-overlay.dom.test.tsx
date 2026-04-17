import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { within } from "@testing-library/dom";
import { EncumbranceOverlayLayer } from "../src/components/map/EncumbranceOverlayLayer";

vi.mock("react-map-gl/maplibre", () => ({
  Source: ({ children, id, data }: { children: React.ReactNode; id: string; data: unknown }) => (
    <div data-testid={`source-${id}`} data-features={JSON.stringify((data as { features?: unknown[] })?.features?.length)}>{children}</div>
  ),
  Layer: ({ id }: { id: string }) => <div data-testid={`layer-${id}`} />,
}));

const geo: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { APN_DASH: "304-78-386" }, geometry: { type: "Point", coordinates: [0, 0] } },
    { type: "Feature", properties: { APN_DASH: "304-77-689" }, geometry: { type: "Point", coordinates: [0, 0] } },
    { type: "Feature", properties: { APN_DASH: "304-78-367" }, geometry: { type: "Point", coordinates: [0, 0] } },
    { type: "Feature", properties: { APN_DASH: "304-78-999" }, geometry: { type: "Point", coordinates: [0, 0] } },
  ],
};

// Lifecycles with root_document_type — two deed-family open + one hoa_lien open
const lifecycles = [
  { id: "lc-001", root_instrument: "20130183450", status: "released", root_document_type: "other" as const },
  { id: "lc-002", root_instrument: "20210057847", status: "open", root_document_type: "other" as const },
  { id: "lc-003", root_instrument: "20150516730", status: "open", root_document_type: "other" as const },
  { id: "lc-008", root_instrument: "20230100000", status: "open", root_document_type: "hoa_lien" as const },
];

const instrumentToApn = new Map([
  ["20130183450", "304-78-386"],
  ["20210057847", "304-78-386"],
  ["20150516730", "304-77-689"],
  ["20230100000", "304-78-367"],
]);

describe("EncumbranceOverlayLayer", () => {
  it("renders nothing when not active", () => {
    const { container } = render(
      <EncumbranceOverlayLayer active={false} lifecycles={lifecycles} instrumentToApn={instrumentToApn} parcelsGeo={geo} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders deed-family source with open-lifecycle deed parcels when active", () => {
    const { container } = render(
      <EncumbranceOverlayLayer active={true} lifecycles={lifecycles} instrumentToApn={instrumentToApn} parcelsGeo={geo} />,
    );
    const deedSource = within(container).getByTestId("source-overlay-encumbrance-deed");
    // lc-002 → 304-78-386, lc-003 → 304-77-689 (lc-001 is released, lc-008 is hoa_lien)
    expect(deedSource.getAttribute("data-features")).toBe("2");
  });

  it("renders lien-family source with open hoa_lien parcels when active", () => {
    const { container } = render(
      <EncumbranceOverlayLayer active={true} lifecycles={lifecycles} instrumentToApn={instrumentToApn} parcelsGeo={geo} />,
    );
    const lienSource = within(container).getByTestId("source-overlay-encumbrance-lien");
    // lc-008 → 304-78-367
    expect(lienSource.getAttribute("data-features")).toBe("1");
  });

  it("renders deed fill and outline layers inside deed source", () => {
    const { container } = render(
      <EncumbranceOverlayLayer active={true} lifecycles={lifecycles} instrumentToApn={instrumentToApn} parcelsGeo={geo} />,
    );
    const deedSource = within(container).getByTestId("source-overlay-encumbrance-deed");
    expect(deedSource.querySelector('[data-testid="layer-overlay-encumbrance-deed-fill"]')).toBeTruthy();
    expect(deedSource.querySelector('[data-testid="layer-overlay-encumbrance-deed-outline"]')).toBeTruthy();
  });

  it("renders lien fill and outline layers inside lien source", () => {
    const { container } = render(
      <EncumbranceOverlayLayer active={true} lifecycles={lifecycles} instrumentToApn={instrumentToApn} parcelsGeo={geo} />,
    );
    const lienSource = within(container).getByTestId("source-overlay-encumbrance-lien");
    expect(lienSource.querySelector('[data-testid="layer-overlay-encumbrance-lien-fill"]')).toBeTruthy();
    expect(lienSource.querySelector('[data-testid="layer-overlay-encumbrance-lien-outline"]')).toBeTruthy();
  });

  it("renders nothing when no open lifecycles exist", () => {
    const closedOnly = [{ id: "lc-001", root_instrument: "20130183450", status: "released", root_document_type: "other" as const }];
    const { container } = render(
      <EncumbranceOverlayLayer active={true} lifecycles={closedOnly} instrumentToApn={instrumentToApn} parcelsGeo={geo} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders only lien source when all open lifecycles are hoa_lien (no deed source)", () => {
    const lienOnly = [{ id: "lc-008", root_instrument: "20230100000", status: "open", root_document_type: "hoa_lien" as const }];
    const { container } = render(
      <EncumbranceOverlayLayer active={true} lifecycles={lienOnly} instrumentToApn={instrumentToApn} parcelsGeo={geo} />,
    );
    expect(within(container).queryByTestId("source-overlay-encumbrance-deed")).toBeNull();
    expect(within(container).queryByTestId("source-overlay-encumbrance-lien")).toBeTruthy();
  });

  it("renders only deed source when no hoa_lien lifecycles are open", () => {
    const deedOnly = [
      { id: "lc-002", root_instrument: "20210057847", status: "open", root_document_type: "other" as const },
    ];
    const { container } = render(
      <EncumbranceOverlayLayer active={true} lifecycles={deedOnly} instrumentToApn={instrumentToApn} parcelsGeo={geo} />,
    );
    expect(within(container).queryByTestId("source-overlay-encumbrance-deed")).toBeTruthy();
    expect(within(container).queryByTestId("source-overlay-encumbrance-lien")).toBeNull();
  });
});
