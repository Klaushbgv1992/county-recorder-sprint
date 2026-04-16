// This module exports only routes + components + pure helpers so it can
// be imported from vitest (no DOM). DOM-bound instantiation — i.e. the
// createBrowserRouter(routes) call — lives in main.tsx. Do not move it
// back here without breaking the routing test suite.

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import type { RouteObject } from "react-router";
import type { Parcel } from "./types";
import { searchParcels } from "./logic/search";
import { AppShell } from "./App";
import { LandingPage } from "./components/LandingPage";
import { ChainOfTitle } from "./components/ChainOfTitle";
import { EncumbranceLifecycle } from "./components/EncumbranceLifecycle";
import { ProofDrawer } from "./components/ProofDrawer";
import { MoatCompareRoute } from "./components/MoatCompareRoute";
import { ActivityHeatMap } from "./components/ActivityHeatMap";
import { SpatialContextPanel } from "./components/SpatialContextPanel";
import { TransactionWizard } from "./components/TransactionWizard";
import { PipelineDashboard } from "./components/PipelineDashboard";
import { StaffWorkbench } from "./components/StaffWorkbench";
import { NameFilteredSearch } from "./components/NameFilteredSearch";
import { CuratorQueue } from "./components/CuratorQueue";
import { StaffParcelView } from "./components/StaffParcelView";
import { useAllParcels } from "./hooks/useAllParcels";
import { useParcelData } from "./hooks/useParcelData";
import { useExaminerActions } from "./hooks/useExaminerActions";
import { useDocumentMeta } from "./hooks/useDocumentMeta";
import { NotInCorpusParcel } from "./components/EmptyStates";

/**
 * Resolve a bare 11-digit instrument number to the APN of the single
 * parcel that owns it. Returns null when the input isn't an 11-digit
 * number, or when no parcel in the corpus owns the instrument.
 */
export function resolveInstrumentToApn(
  instrumentNumber: string,
  parcels: Parcel[],
): string | null {
  const results = searchParcels(instrumentNumber, parcels);
  if (results.length !== 1) return null;
  const only = results[0];
  if (only.matchType !== "instrument") return null;
  return only.parcel.apn;
}

/**
 * Target URL for the /instrument/:n redirect, or null when the
 * instrument can't be attributed to a single parcel. Pure function so
 * the resolver component is a trivial wrapper around it + navigate().
 */
export function redirectTargetForInstrument(
  instrumentNumber: string,
  parcels: Parcel[],
): string | null {
  const apn = resolveInstrumentToApn(instrumentNumber, parcels);
  return apn ? `/parcel/${apn}/instrument/${instrumentNumber}` : null;
}


function SplitPane({
  main,
  drawer,
}: {
  main: ReactNode;
  drawer: ReactNode | null;
}) {
  const drawerOpen = drawer !== null;
  return (
    <div className="flex-1 flex overflow-hidden">
      <main
        className={`${drawerOpen ? "w-1/2" : "w-full"} overflow-auto transition-[width] duration-200`}
      >
        <div className="max-w-6xl mx-auto px-6 py-6">{main}</div>
      </main>
      {drawerOpen && (
        <aside className="w-1/2 border-l border-gray-200 bg-white flex flex-col overflow-hidden shrink-0">
          {drawer}
        </aside>
      )}
    </div>
  );
}

function corpusProvenanceOf(data: ReturnType<typeof useParcelData>) {
  return data.instruments.reduce(
    (acc, inst) => {
      const s = inst.provenance_summary;
      if (!s) return acc;
      return {
        public_api: acc.public_api + s.public_api_count,
        ocr: acc.ocr + s.ocr_count,
        manual_entry: acc.manual_entry + s.manual_entry_count,
      };
    },
    { public_api: 0, ocr: 0, manual_entry: 0 },
  );
}

function ParcelGuard({
  children,
}: {
  children: (apn: string) => ReactNode;
}) {
  const { apn } = useParams();
  const parcels = useAllParcels();
  if (!apn || !parcels.find((p) => p.apn === apn)) {
    return (
      <SplitPane
        main={
          <NotInCorpusParcel
            title="Parcel not in this corpus"
            message={apn ? `APN ${apn} is not in the curated set.` : undefined}
          />
        }
        drawer={null}
      />
    );
  }
  return <>{children(apn)}</>;
}

function ChainRoute() {
  return <ParcelGuard>{(apn) => <ChainRouteInner apn={apn} />}</ParcelGuard>;
}

function ChainRouteInner({ apn }: { apn: string }) {
  const { instrumentNumber } = useParams();
  const data = useParcelData(apn);
  const navigate = useNavigate();

  useDocumentMeta({
    title: `Chain of title — ${data.parcel.address}, ${data.parcel.city} ${data.parcel.state} (APN ${data.parcel.apn}) — Maricopa County Recorder`,
    description: `Parcel-keyed chain of title for APN ${data.parcel.apn}, owned by ${data.parcel.current_owner}. ${data.instruments.length} instruments curated, verified through ${data.pipelineStatus.verified_through_date}.`,
    ogImage: "/og-default.png",
    ogUrl: `${window.location.origin}/parcel/${data.parcel.apn}`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Place",
      name: `Parcel ${data.parcel.apn} — ${data.parcel.address}`,
      address: {
        "@type": "PostalAddress",
        streetAddress: data.parcel.address,
        addressLocality: data.parcel.city,
        addressRegion: data.parcel.state,
        postalCode: data.parcel.zip,
        addressCountry: "US",
      },
      additionalProperty: [
        {
          "@type": "PropertyValue",
          name: "APN",
          value: data.parcel.apn,
        },
        {
          "@type": "PropertyValue",
          name: "Subdivision",
          value: data.parcel.subdivision,
        },
        {
          "@type": "PropertyValue",
          name: "Verified through",
          value: data.pipelineStatus.verified_through_date,
        },
      ],
    },
  });

  const drawerInstrument = instrumentNumber ?? null;
  const drawerOpen = drawerInstrument !== null;
  const instrumentForDrawer = drawerOpen
    ? data.instruments.find((i) => i.instrument_number === drawerInstrument)
    : undefined;
  const linksForDrawer = drawerOpen
    ? data.links.filter(
        (l) =>
          l.source_instrument === drawerInstrument ||
          l.target_instrument === drawerInstrument,
      )
    : [];

  const openDrawer = (n: string) =>
    navigate(`/parcel/${apn}/instrument/${n}`);
  const closeDrawer = () => navigate(`/parcel/${apn}`);

  const drawerNode =
    drawerOpen && instrumentForDrawer ? (
      <ProofDrawer
        instrument={instrumentForDrawer}
        links={linksForDrawer}
        corpusProvenance={corpusProvenanceOf(data)}
        onClose={closeDrawer}
        parcel={data.parcel}
        allInstruments={data.instruments}
        allLinks={data.links}
        lifecycles={data.lifecycles}
        pipelineStatus={data.pipelineStatus}
      />
    ) : drawerOpen ? (
      <NotInCorpusParcel
        title="Instrument not on this parcel"
        message={`Instrument ${drawerInstrument} is not in the curated set for APN ${apn}.`}
      />
    ) : null;

  return (
    <SplitPane
      main={
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <ChainOfTitle
              parcel={data.parcel}
              instruments={data.instruments}
              links={data.links}
              onOpenDocument={openDrawer}
            />
          </div>
          <SpatialContextPanel apn={apn} />
        </div>
      }
      drawer={drawerNode}
    />
  );
}

function EncumbranceRoute() {
  return (
    <ParcelGuard>
      {(apn) => <EncumbranceRouteInner apn={apn} />}
    </ParcelGuard>
  );
}

function EncumbranceRouteInner({ apn }: { apn: string }) {
  const { instrumentNumber } = useParams();
  const data = useParcelData(apn);
  const examiner = useExaminerActions(data.links, apn);
  const navigate = useNavigate();

  useDocumentMeta({
    title: `Encumbrance lifecycle — ${data.parcel.address}, ${data.parcel.city} ${data.parcel.state} (APN ${data.parcel.apn}) — Maricopa County Recorder`,
    description: `Open and closed encumbrance lifecycles for APN ${data.parcel.apn}, owned by ${data.parcel.current_owner}. Verified through ${data.pipelineStatus.verified_through_date}.`,
    ogImage: "/og-default.png",
    ogUrl: `${window.location.origin}/parcel/${data.parcel.apn}/encumbrances`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Place",
      name: `Parcel ${data.parcel.apn} — ${data.parcel.address}`,
      address: {
        "@type": "PostalAddress",
        streetAddress: data.parcel.address,
        addressLocality: data.parcel.city,
        addressRegion: data.parcel.state,
        postalCode: data.parcel.zip,
        addressCountry: "US",
      },
    },
  });

  const drawerInstrument = instrumentNumber ?? null;
  const drawerOpen = drawerInstrument !== null;
  const instrumentForDrawer = drawerOpen
    ? data.instruments.find((i) => i.instrument_number === drawerInstrument)
    : undefined;
  const linksForDrawer = drawerOpen
    ? data.links.filter(
        (l) =>
          l.source_instrument === drawerInstrument ||
          l.target_instrument === drawerInstrument,
      )
    : [];

  const openDrawer = (n: string) =>
    navigate(`/parcel/${apn}/encumbrances/instrument/${n}`);
  const closeDrawer = () => navigate(`/parcel/${apn}/encumbrances`);

  const drawerNode =
    drawerOpen && instrumentForDrawer ? (
      <ProofDrawer
        instrument={instrumentForDrawer}
        links={linksForDrawer}
        corpusProvenance={corpusProvenanceOf(data)}
        onClose={closeDrawer}
        parcel={data.parcel}
        allInstruments={data.instruments}
        allLinks={data.links}
        lifecycles={data.lifecycles}
        pipelineStatus={data.pipelineStatus}
      />
    ) : drawerOpen ? (
      <NotInCorpusParcel
        title="Instrument not on this parcel"
        message={`Instrument ${drawerInstrument} is not in the curated set for APN ${apn}.`}
      />
    ) : null;

  return (
    <SplitPane
      main={
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <EncumbranceLifecycle
              parcel={data.parcel}
              instruments={data.instruments}
              links={data.links}
              lifecycles={data.lifecycles}
              pipelineStatus={data.pipelineStatus}
              linkActions={examiner.linkActions}
              lifecycleOverrides={examiner.lifecycleOverrides}
              onSetLinkAction={examiner.setLinkAction}
              onSetLifecycleOverride={examiner.setLifecycleOverride}
              onOpenDocument={openDrawer}
              viewedInstrumentNumber={drawerInstrument ?? undefined}
            />
          </div>
          <SpatialContextPanel apn={apn} />
        </div>
      }
      drawer={drawerNode}
    />
  );
}

function InstrumentResolver() {
  const { instrumentNumber } = useParams();
  const parcels = useAllParcels();
  const navigate = useNavigate();

  useEffect(() => {
    if (!instrumentNumber) return;
    const target = redirectTargetForInstrument(instrumentNumber, parcels);
    if (target) navigate(target, { replace: true });
  }, [instrumentNumber, parcels, navigate]);

  const target = instrumentNumber
    ? redirectTargetForInstrument(instrumentNumber, parcels)
    : null;
  if (instrumentNumber && !target) {
    return (
      <NotInCorpusParcel
        title="Instrument not in this corpus"
        message={`No parcel owns instrument ${instrumentNumber} in the curated set.`}
      />
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center text-sm text-gray-600">
      Resolving instrument…
    </div>
  );
}

export const routes: RouteObject[] = [
  { path: "/", element: <LandingPage /> },
  { path: "/county-activity", element: <ActivityHeatMap /> },
  {
    element: <AppShell />,
    children: [
      {
        id: "chain",
        path: "parcel/:apn",
        element: <ChainRoute />,
      },
      {
        id: "chain-instrument",
        path: "parcel/:apn/instrument/:instrumentNumber",
        element: <ChainRoute />,
      },
      {
        id: "encumbrance",
        path: "parcel/:apn/encumbrances",
        element: <EncumbranceRoute />,
      },
      {
        id: "encumbrance-instrument",
        path: "parcel/:apn/encumbrances/instrument/:instrumentNumber",
        element: <EncumbranceRoute />,
      },
      {
        id: "instrument-resolver",
        path: "instrument/:instrumentNumber",
        element: <InstrumentResolver />,
      },
      {
        id: "moat-compare",
        path: "moat-compare",
        element: <MoatCompareRoute />,
      },
      {
        id: "commitment-new",
        path: "parcel/:apn/commitment/new",
        element: <TransactionWizard />,
      },
      {
        id: "pipeline",
        path: "pipeline",
        element: <PipelineDashboard />,
      },
      {
        id: "staff",
        path: "staff",
        element: <StaffWorkbench />,
      },
      {
        id: "staff-search",
        path: "staff/search",
        element: <NameFilteredSearch />,
      },
      {
        id: "staff-queue",
        path: "staff/queue",
        element: <CuratorQueue />,
      },
      {
        id: "staff-parcel",
        path: "staff/parcel/:apn",
        element: <StaffParcelView />,
      },
      {
        id: "not-found",
        path: "*",
        element: <NotInCorpusParcel />,
      },
    ],
  },
];
