import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { EncumbranceLifecycle } from "../src/components/EncumbranceLifecycle";
import { loadParcelDataByApn } from "../src/data-loader";
import { detectAnomalies } from "../src/logic/anomaly-detector";
import { TerminologyProvider } from "../src/terminology/TerminologyContext";

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
  const findings = detectAnomalies(apn);
  const onSetLinkAction = vi.fn();
  const onSetLifecycleOverride = vi.fn();
  const onOpenDocument = vi.fn();
  const utils = render(
    <MemoryRouter>
      <TerminologyProvider>
        <EncumbranceLifecycle
          parcel={data.parcel}
          instruments={data.instruments}
          links={links}
          lifecycles={data.lifecycles}
          pipelineStatus={data.pipelineStatus}
          findings={findings}
          linkActions={Object.fromEntries(
            links.map((l) => [l.id, l.examiner_action]),
          )}
          lifecycleOverrides={{}}
          onSetLinkAction={onSetLinkAction}
          onSetLifecycleOverride={onSetLifecycleOverride}
          onOpenDocument={onOpenDocument}
        />
      </TerminologyProvider>
    </MemoryRouter>,
  );
  return { ...utils, data, onOpenDocument };
}

// Locate a lifecycle card by its root instrument number printed in the header.
// After Gap #17 fix, the label prefix depends on document_type (e.g. "DOT", "Deed", "Plat Map").
// After Task 7 (font-mono), the instrument number is wrapped in a <span>, so the text is split
// across sibling nodes — use a function matcher against the full textContent of the parent span.
function lifecycleCardFor(rootInstrument: string): HTMLElement {
  // Match the outer <span> whose combined text content is "<Label>: <instrumentNumber>"
  const header = screen.getByText(
    (_content, element) => {
      if (!element) return false;
      const text = element.textContent ?? "";
      return new RegExp(`:\\s*${rootInstrument}$`).test(text);
    },
  );
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

    // lc-002 now sees multiple candidate reconveyances in its pool:
    //   20210075858 (real 2021 release, unlinked here since link-002 was
    //     dropped) — canAccept=true, renders an enabled Accept button.
    //   20050100001 (synthetic 2005 release from the historical-chain
    //     extension) — already linked via link-009 to lc-010, so
    //     canAccept=false and the Accept button renders disabled.
    // Filter to the enabled button to isolate the happy-path candidate.
    const acceptButtons = within(initialCard).getAllByRole("button", {
      name: "Accept",
    });
    const acceptBtn = acceptButtons.find((b) => !(b as HTMLButtonElement).disabled);
    expect(acceptBtn).toBeDefined();
    await user.click(acceptBtn!);

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

  it("lc-003 (HOGUE) renders the empty-state moat rationale verbatim", async () => {
    const user = userEvent.setup();
    renderEncumbrance(HOGUE_APN);
    // The swimlane starts with a collapsed-pill showing the cross-parcel scan
    // summary. Clicking it expands CandidateReleasesPanel with the moat text.
    const expandBtn = screen.getByRole("button", {
      name: /Cross-parcel scan.*Expand/i,
    });
    await user.click(expandBtn);
    // Moat-talking-point text from buildEmptyStateRationale + parcel data.
    expect(
      screen.getByText(/Cross-parcel scan: scanned/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Shamrock Estates Phase 2A parcel corpus/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/county-internal full-name scan closes this gap/i),
    ).toBeInTheDocument();
  });

  it("renders label derived from document_type for lc-004 (subdivision plat)", () => {
    // lc-004 root is instrument 20010093192, document_type: "other",
    // document_type_raw: "PLAT MAP"
    // Should NOT render a Deed of Trust header for this lifecycle.
    // The swimlane uses rootLabel() which humanizes document_type_raw for "other".
    renderEncumbrance(POPHAM_APN);
    expect(
      screen.queryByText(
        (_c, el) => !!el && /Deed of Trust:\s*20010093192$/.test(el.textContent ?? ""),
      ),
    ).not.toBeInTheDocument();
    // The swimlane renders "Plat Map: <instrumentNumber>" for document_type "other"
    // with document_type_raw "PLAT MAP" (instrument number is in a child <span>)
    expect(
      screen.getByText((_c, el) => !!el && /Plat Map:\s*20010093192$/.test(el.textContent ?? "")),
    ).toBeInTheDocument();
  });

  it("lc-002 header uses the full 'Deed of Trust' label (not the DOT shorthand)", () => {
    renderEncumbrance(POPHAM_APN);
    expect(
      screen.getByText(
        (_c, el) =>
          !!el && /Deed of Trust:\s*20210057847$/.test(el.textContent ?? ""),
      ),
    ).toBeInTheDocument();
  });
});
