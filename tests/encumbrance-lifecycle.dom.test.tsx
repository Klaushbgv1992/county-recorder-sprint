import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { EncumbranceLifecycle } from "../src/components/EncumbranceLifecycle";
import { loadParcelDataByApn } from "../src/data-loader";

const POPHAM_APN = "304-78-386";
const HOGUE_APN = "304-77-689";
const POPHAM_DOT_OPEN = "20210057847"; // lc-002 root
const POPHAM_RECONVEY_2021 = "20210075858"; // candidate for lc-002

function renderEncumbrance(
  apn: string,
  options: { dropLinkIds?: string[] } = {},
) {
  const data = loadParcelDataByApn(apn);
  const links = options.dropLinkIds
    ? data.links.filter((l) => !options.dropLinkIds!.includes(l.id))
    : data.links;
  const onSetLinkAction = vi.fn();
  const onSetLifecycleOverride = vi.fn();
  const onOpenDocument = vi.fn();
  const utils = render(
    <EncumbranceLifecycle
      parcel={data.parcel}
      instruments={data.instruments}
      links={links}
      lifecycles={data.lifecycles}
      pipelineStatus={data.pipelineStatus}
      linkActions={Object.fromEntries(
        links.map((l) => [l.id, l.examiner_action]),
      )}
      lifecycleOverrides={{}}
      onSetLinkAction={onSetLinkAction}
      onSetLifecycleOverride={onSetLifecycleOverride}
      onOpenDocument={onOpenDocument}
    />,
  );
  return { ...utils, data, onOpenDocument };
}

// Locate a lifecycle card by its root instrument number printed in the header.
// After Gap #17 fix, the label prefix depends on document_type (e.g. "DOT", "Deed", "Plat Map").
function lifecycleCardFor(rootInstrument: string): HTMLElement {
  // Match any label format: "<Label>: <instrumentNumber>"
  const header = screen.getByText(new RegExp(`:\\s*${rootInstrument}$`));
  // Walk up to the lifecycle card root (the rounded white container).
  let node: HTMLElement | null = header;
  while (node && !node.classList.contains("rounded-lg")) {
    node = node.parentElement as HTMLElement | null;
  }
  if (!node) throw new Error(`No lifecycle card found for instrument ${rootInstrument}`);
  return node;
}

describe("EncumbranceLifecycle UI wiring", () => {
  afterEach(() => cleanup());

  it("lc-002 surfaces 20210075858 as a release candidate", () => {
    renderEncumbrance(POPHAM_APN);
    const card = lifecycleCardFor(POPHAM_DOT_OPEN);
    expect(
      within(card).getByText("Candidate releases (matcher)"),
    ).toBeInTheDocument();
    // The reconveyance instrument number is rendered as a clickable button
    // inside the candidate panel.
    expect(
      within(card).getByRole("button", { name: POPHAM_RECONVEY_2021 }),
    ).toBeInTheDocument();
    // Status starts open (no curated release link in lc-002's child set).
    expect(within(card).getByText("Open")).toBeInTheDocument();
  });

  it("clicking Accept on the lc-002 candidate flips status to Released", async () => {
    const user = userEvent.setup();
    // Drop the curated link-002 (20210075858 → 20130183450) so 20210075858
    // is not pre-claimed by lc-001 — the candidate becomes Acceptable for
    // lc-002. This isolates the Accept happy path from the already-linked
    // hero scenario already covered by candidate-release-glue.test.ts.
    renderEncumbrance(POPHAM_APN, { dropLinkIds: ["link-002"] });
    const initialCard = lifecycleCardFor(POPHAM_DOT_OPEN);
    expect(within(initialCard).getByText("Open")).toBeInTheDocument();

    const acceptBtn = within(initialCard).getByRole("button", {
      name: "Accept",
    });
    await user.click(acceptBtn);

    // Re-locate the card after re-render, then assert the status badge and
    // matcher-rationale text. This proves the synthetic algorithmic
    // DocumentLink is wired through computeLifecycleStatus end-to-end.
    const card = lifecycleCardFor(POPHAM_DOT_OPEN);
    expect(within(card).getByText("Released")).toBeInTheDocument();
    expect(within(card).queryByText("Open")).not.toBeInTheDocument();
    expect(
      within(card).getByText(/Accepted via release-candidate matcher, score=/),
    ).toBeInTheDocument();
  });

  it("lc-003 (HOGUE) renders the empty-state moat rationale verbatim", () => {
    renderEncumbrance(HOGUE_APN);
    // Moat-talking-point text from buildEmptyStateRationale + parcel data.
    expect(
      screen.getByText(/Matcher ran against 0 reconveyances in/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Shamrock Estates Phase 2A corpus/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/county-internal full-name scan closes this gap/i),
    ).toBeInTheDocument();
  });

  it("renders label derived from document_type for lc-004 (subdivision plat)", () => {
    // lc-004 root is instrument 20010093192, document_type: "other",
    // document_type_raw: "PLAT MAP"
    // Should NOT render "DOT:" for this lifecycle — label should be "Plat Map"
    renderEncumbrance(POPHAM_APN);
    // After fix, "DOT: 20010093192" must not appear
    expect(screen.queryByText(/DOT: 20010093192/)).not.toBeInTheDocument();
    // Instead, the humanized raw type should be the label prefix
    expect(screen.getByText(/Plat Map: 20010093192/)).toBeInTheDocument();
  });
});
