// src/components/homeowner/cards.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { TitleCleanCard } from "./TitleCleanCard";
import { LastSaleCard } from "./LastSaleCard";
import { OpenLiensCard } from "./OpenLiensCard";
import { LenderHistoryCard } from "./LenderHistoryCard";

const APN = "304-78-386";

function Wrap({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

afterEach(() => cleanup());

describe("TitleCleanCard", () => {
  it("renders 'Title looks clean' + drill-in to encumbrances when clean", () => {
    render(
      <TitleCleanCard apn={APN} titleClean={{ clean: true, openCount: 0, openLifecycleIds: [] }} />,
      { wrapper: Wrap },
    );
    expect(screen.getByRole("heading", { name: /is the title clean/i })).toBeInTheDocument();
    expect(screen.getByText(/title looks clean/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see the evidence/i })).toHaveAttribute("href", `/parcel/${APN}/encumbrances`);
  });

  it("renders 'N open item(s)' when not clean", () => {
    render(
      <TitleCleanCard apn={APN} titleClean={{ clean: false, openCount: 2, openLifecycleIds: ["lc-1", "lc-2"] }} />,
      { wrapper: Wrap },
    );
    expect(screen.getByText(/2 open/i)).toBeInTheDocument();
  });
});

describe("LastSaleCard", () => {
  it("renders 'not recorded' when no deed", () => {
    render(
      <LastSaleCard apn={APN} lastSale={{ found: false, recordingNumber: "", recording_date: "", year: "", buyersPhrase: "", sellersPhrase: "", priceDisplay: "", priceProvenance: null, provenance: "none" }} />,
      { wrapper: Wrap },
    );
    expect(screen.getByText(/no recent sale recorded/i)).toBeInTheDocument();
  });

  it("renders year + buyers + sellers + price-not-recorded note by default", () => {
    render(
      <LastSaleCard apn={APN} lastSale={{
        found: true,
        recordingNumber: "20210057847",
        recording_date: "2021-01-22",
        year: "2021",
        buyersPhrase: "the Pophams",
        sellersPhrase: "The Madison Living Trust",
        priceDisplay: "Price not recorded by the county",
        priceProvenance: null,
        provenance: "public_api",
      }} />,
      { wrapper: Wrap },
    );
    expect(screen.getByText(/2021/)).toBeInTheDocument();
    expect(screen.getByText(/the Pophams/)).toBeInTheDocument();
    expect(screen.getByText(/Madison Living Trust/)).toBeInTheDocument();
    expect(screen.getByText(/price not recorded/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see the evidence/i }))
      .toHaveAttribute("href", `/parcel/${APN}/instrument/20210057847`);
  });
});

describe("OpenLiensCard", () => {
  it("renders 'no open liens' when count is zero", () => {
    render(<OpenLiensCard apn={APN} openLiens={{ count: 0, summaries: [] }} />, { wrapper: Wrap });
    expect(screen.getByText(/no open liens/i)).toBeInTheDocument();
  });

  it("lists summaries when present", () => {
    render(<OpenLiensCard apn={APN} openLiens={{
      count: 1,
      summaries: [{ lifecycleId: "lc-x", rationale: "Reconveyance not yet recorded.", rootInstrument: "20200000001" }],
    }} />, { wrapper: Wrap });
    expect(screen.getByText(/reconveyance not yet recorded/i)).toBeInTheDocument();
  });
});

describe("LenderHistoryCard", () => {
  it("renders 'no mortgages on record' when entries empty", () => {
    render(<LenderHistoryCard apn={APN} lenderHistory={{ entries: [] }} />, { wrapper: Wrap });
    expect(screen.getByText(/no mortgages on record/i)).toBeInTheDocument();
  });

  it("lists each lender with year and a drill-in link to the chain", () => {
    render(<LenderHistoryCard apn={APN} lenderHistory={{
      entries: [
        { recordingNumber: "20130183450", year: "2013", recording_date: "2013-02-01", lenderDisplayName: "VIP Mortgage", provenance: "manual_entry" },
        { recordingNumber: "20210057848", year: "2021", recording_date: "2021-01-22", lenderDisplayName: "VIP Mortgage", provenance: "manual_entry" },
      ],
    }} />, { wrapper: Wrap });
    expect(screen.getByText("2013")).toBeInTheDocument();
    expect(screen.getByText("2021")).toBeInTheDocument();
    expect(screen.getAllByText(/VIP Mortgage/).length).toBe(2);
    expect(screen.getByRole("link", { name: /see the evidence/i }))
      .toHaveAttribute("href", `/parcel/${APN}`);
  });
});
