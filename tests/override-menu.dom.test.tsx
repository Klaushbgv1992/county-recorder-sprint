import { describe, it, expect, vi, afterEach } from "vitest";
import { render, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router";
import { EncumbranceLifecycle } from "../src/components/EncumbranceLifecycle";
import { loadParcelDataByApn } from "../src/data-loader";
import { detectAnomalies } from "../src/logic/anomaly-detector";
import { TerminologyProvider } from "../src/terminology/TerminologyContext";

const POPHAM_APN = "304-78-386";

function renderEncumbrance(apn: string) {
  const data = loadParcelDataByApn(apn);
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
          links={data.links}
          lifecycles={data.lifecycles}
          pipelineStatus={data.pipelineStatus}
          findings={findings}
          linkActions={Object.fromEntries(
            data.links.map((l) => [l.id, l.examiner_action]),
          )}
          lifecycleOverrides={{}}
          onSetLinkAction={onSetLinkAction}
          onSetLifecycleOverride={onSetLifecycleOverride}
          onOpenDocument={onOpenDocument}
        />
      </TerminologyProvider>
    </MemoryRouter>,
  );
  return { ...utils, data, onSetLinkAction, onSetLifecycleOverride, onOpenDocument };
}

describe("OverrideMenu behavior", () => {
  afterEach(() => cleanup());

  it("opens the override menu and dispatches setLifecycleOverride on click", async () => {
    const user = userEvent.setup();
    const { onSetLifecycleOverride } = renderEncumbrance(POPHAM_APN);

    // Locate the lc-001 section and its ⋯ button
    const section = document.getElementById("lc-001");
    expect(section).not.toBeNull();

    const overrideBtn = within(section!).getByRole("button", {
      name: "Examiner overrides",
    });
    await user.click(overrideBtn);

    // Menu should now be open
    const menu = within(section!).getByRole("menu");
    expect(menu).toBeInTheDocument();

    // Click the "released" override option
    const releasedBtn = within(menu).getByRole("button", { name: /released/i });
    await user.click(releasedBtn);

    expect(onSetLifecycleOverride).toHaveBeenCalledWith("lc-001", "released");
  });

  it("closes the override menu when clicking outside", async () => {
    const user = userEvent.setup();
    renderEncumbrance(POPHAM_APN);

    // Open lc-001's override menu
    const section = document.getElementById("lc-001");
    expect(section).not.toBeNull();

    const overrideBtn = within(section!).getByRole("button", {
      name: "Examiner overrides",
    });
    await user.click(overrideBtn);

    // Confirm the menu is open
    expect(within(section!).getByRole("menu")).toBeInTheDocument();

    // Click outside the menu — use document.body as the outside target
    await user.click(document.body);

    // Menu should be gone
    expect(within(section!).queryByRole("menu")).not.toBeInTheDocument();
  });
});
