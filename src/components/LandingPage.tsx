// src/components/LandingPage.tsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router";
import { CountyMap, type HighlightedParcel } from "./CountyMap";
import { OverlayToggles } from "./OverlayToggles";
import { ParcelDrawer } from "./ParcelDrawer";
import { AnomalySummaryPanel } from "./map/AnomalySummaryPanel";
import { FeaturedParcels } from "./FeaturedParcels";
import { PlantVsCountyProof } from "./PlantVsCountyProof";
import { SearchHero } from "./SearchHero";
import { usePortalMode } from "../hooks/usePortalMode";
import { PortalModeToggle } from "./PortalModeToggle";
import { HomeownerHero } from "./HomeownerHero";
import { WalkthroughBanner } from "./WalkthroughBanner";
import { ScenarioPicker } from "./ScenarioPicker";
import { useWalkthrough } from "../walkthrough/useWalkthrough";
import { useAllParcels } from "../hooks/useAllParcels";
import { useLandingUrlState } from "../hooks/useLandingUrlState";
import { buildSearchableIndex } from "../logic/searchable-index";
import { AssessorParcel } from "../logic/assessor-parcel";
import { resolveDrawerVariant } from "../logic/drawer-variant";
import { SEED_COUNT } from "../data/gilbert-seed-count";
import { LifecyclesFile, StaffAnomalyFileSchema } from "../schemas";
import { loadAllInstruments, loadAllParcels } from "../data-loader";
import lifecyclesRaw from "../data/lifecycles.json";
import anomaliesRaw_ from "../data/staff-anomalies.json";
import type { CacheEntry } from "../data/load-cached-neighbors";

const anomaliesRaw = StaffAnomalyFileSchema.parse(anomaliesRaw_);

const HIGHLIGHTED: HighlightedParcel[] = [
  { apn: "304-78-386", status: "primary", label: "POPHAM" },
  { apn: "304-77-689", status: "backup", label: "HOGUE (counter-example)" },
  { apn: "304-78-409", status: "subdivision_common", label: "Seville HOA tract" },
];

const LIFECYCLES = LifecyclesFile.parse(lifecyclesRaw).lifecycles;

export function LandingPage() {
  const navigate = useNavigate();
  const parcels = useAllParcels();
  const { query, selectedApn, overlays, setQuery, setSelectedApn, toggleOverlay } =
    useLandingUrlState();
  const { mode, setMode } = usePortalMode();
  // Examiner walkthrough sets ?tour=examiner on the URL. When it's on, the
  // WalkthroughBanner owns on-screen guidance and the map's intro pulse is
  // suppressed so the two don't compete.
  const walkthrough = useWalkthrough();

  // Mobile detection (768px breakpoint matches Tailwind md:)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Dynamic import: Gilbert assessor GIS polygons (~8MB — kept out of initial bundle)
  const [assessor, setAssessor] = useState<GeoJSON.FeatureCollection | null>(null);
  useEffect(() => {
    import("../data/gilbert-parcels-geo.json").then((m) =>
      setAssessor(m.default as GeoJSON.FeatureCollection)
    );
  }, []);

  // Dynamic import: pre-cached recorder neighbor data
  const [cachedData, setCachedData] = useState<Map<string, CacheEntry> | null>(null);
  useEffect(() => {
    import("../data/load-cached-neighbors").then((m) => setCachedData(m.default));
  }, []);

  // Derived APN sets for variant resolution
  const curatedApns = useMemo(() => new Set(parcels.map((p) => p.apn)), [parcels]);
  const cachedApns = useMemo(
    () => (cachedData ? new Set(cachedData.keys()) : new Set<string>()),
    [cachedData]
  );
  const seededApns = useMemo(() => {
    if (!assessor) return new Set<string>();
    return new Set(
      assessor.features
        .map((f) => f.properties?.APN_DASH as string | undefined)
        .filter((apn): apn is string => Boolean(apn))
    );
  }, [assessor]);

  // Searchable index (requires both assessor + cachedData to be populated)
  const searchables = useMemo(() => {
    if (!assessor) return [];
    const parsed = assessor.features
      .map((f) => {
        try {
          return AssessorParcel.parse(f.properties);
        } catch {
          return null;
        }
      })
      .filter((p): p is ReturnType<typeof AssessorParcel.parse> => p !== null);
    const cacheMap = new Map(
      [...(cachedData?.entries() ?? [])].map(([apn, v]) => [
        apn,
        { recent_instruments: v.recent_instruments },
      ])
    );
    return buildSearchableIndex(parcels, cacheMap, parsed);
  }, [parcels, assessor, cachedData]);

  // Drawer variant + payload
  const variant = selectedApn
    ? resolveDrawerVariant(selectedApn, { curatedApns, cachedApns, seededApns })
    : null;

  const drawerPayload = useMemo(() => {
    if (!selectedApn || !variant) return null;

    if (variant === "curated") {
      const p = parcels.find((pp) => pp.apn === selectedApn);
      return p ? { parcel: p } : null;
    }

    if (variant === "recorder_cached" && cachedData) {
      const c = cachedData.get(selectedApn);
      if (!c) return null;
      const feat = assessor?.features.find(
        (f) => f.properties?.APN_DASH === selectedApn
      );
      if (!feat) return null;
      const polygon = AssessorParcel.parse(feat.properties);
      return {
        polygon,
        lastRecordedDate: c.lastRecordedDate,
        lastDocType: c.lastDocType,
        recent_instruments: c.recent_instruments,
      };
    }

    if (variant === "assessor_only" && assessor) {
      const feat = assessor.features.find(
        (f) => f.properties?.APN_DASH === selectedApn
      );
      if (!feat) return null;
      return { polygon: AssessorParcel.parse(feat.properties) };
    }

    // not_in_seeded_area — no payload needed (component uses seededCount prop)
    return null;
  }, [selectedApn, variant, parcels, cachedData, assessor]);

  // Anomaly panel open state (tied to the anomaly overlay toggle)
  const [anomalyPanelOpen, setAnomalyPanelOpen] = useState(false);
  useEffect(() => {
    if (!overlays.has("anomaly")) setAnomalyPanelOpen(false);
  }, [overlays]);

  // All curated instruments (used by AnomalySummaryPanel for citation rendering)
  const allInstruments = useMemo(() => loadAllInstruments(), []);

  // Instrument → APN map (for encumbrance overlay layer)
  // We derive this by cross-referencing each parcel's instrument_numbers list.
  const instrumentToApn = useMemo(() => {
    const allParcels = loadAllParcels();
    const m = new Map<string, string>();
    for (const p of allParcels) {
      for (const num of p.instrument_numbers ?? []) {
        m.set(num, p.apn);
      }
    }
    // Also pick up any instruments loaded directly (belt-and-suspenders)
    for (const inst of allInstruments) {
      if (!m.has(inst.instrument_number)) {
        // Use the first parcel that owns this instrument (already mapped above)
        // If not found via parcels, skip — no parcel_apn on Instrument type.
      }
    }
    return m;
  }, [allInstruments]);

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-end px-6 pt-3">
          <PortalModeToggle mode={mode} onChange={setMode} />
        </div>
        {mode === "homeowner" ? (
          <HomeownerHero
            searchables={searchables}
            onResolve={(apn) => navigate(`/parcel/${apn}/home`)}
          />
        ) : (
          <SearchHero
            value={query}
            onChange={setQuery}
            searchables={searchables}
            instruments={allInstruments}
            instrumentToApn={instrumentToApn}
            onSelectCurated={(apn) => navigate(`/parcel/${apn}`)}
            onSelectInstrument={(apn, n) => navigate(`/parcel/${apn}/instrument/${n}`)}
            onSelectDrawer={(apn) => setSelectedApn(apn)}
            onSelectParty={(normalizedName) => navigate(`/party/${normalizedName}`)}
          />
        )}
        {/* party-search hero card — Agent 3 */}
      </div>
      {walkthrough.active ? <WalkthroughBanner /> : <ScenarioPicker />}

      {/* Moat-as-evidence band — stages the plant-vs-county comparison
          with real POPHAM data so a reviewer sees the plant lose within
          15 seconds of arriving. Detail page remains at /moat-compare. */}
      <PlantVsCountyProof />

      {/* Full-bleed map — flex-1 fills remaining viewport below the
          PipelineBanner + SearchHero. The verified-through strip in
          RootLayout carries the moat claim; map + search are the hero. */}
      <section className="relative flex-1 min-h-[70vh] border-b border-slate-200">
        <CountyMap
          highlightedParcels={HIGHLIGHTED}
          onParcelClick={(apn) => setSelectedApn(apn)}
          assessorPolygons={assessor ?? { type: "FeatureCollection", features: [] }}
          cachedApns={cachedApns}
          overlays={overlays}
          onAssessorParcelClick={(apn) => setSelectedApn(apn)}
          lifecycles={LIFECYCLES}
          anomalies={anomaliesRaw}
          instrumentToApn={instrumentToApn}
          showIntro={!selectedApn && !query && overlays.size === 0 && !walkthrough.active}
          onIntroClick={() => setSelectedApn("304-78-386")}
        />
        <OverlayToggles
          overlays={overlays}
          onToggle={(name) => {
            toggleOverlay(name);
            if (name === "anomaly") setAnomalyPanelOpen((prev) => !prev);
          }}
          isMobile={isMobile}
        />
        <AnomalySummaryPanel
          anomalies={anomaliesRaw}
          instruments={allInstruments}
          open={anomalyPanelOpen && overlays.has("anomaly")}
          onClose={() => setAnomalyPanelOpen(false)}
          onOpenDocument={(n) => navigate(`/instrument/${n}`)}
        />
        {selectedApn && variant && (
          <ParcelDrawer
            variant={variant}
            payload={drawerPayload}
            onClose={() => setSelectedApn(null)}
            seededCount={SEED_COUNT}
            isMobile={isMobile}
          />
        )}
      </section>

      {/* Below-map content — preserved from original */}
      <div id="featured-parcels">
        <FeaturedParcels parcels={parcels} />
      </div>

      <footer className="border-t border-slate-200 bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-500">
          <span className="font-medium uppercase tracking-wider text-slate-400">
            Elsewhere
          </span>
          <Link
            to="/county-activity"
            className="hover:text-slate-800 hover:underline underline-offset-2"
          >
            County activity
          </Link>
          <Link
            to="/why"
            className="hover:text-slate-800 hover:underline underline-offset-2"
          >
            Why this matters
          </Link>
          <Link
            to="/moat-compare"
            className="hover:text-slate-800 hover:underline underline-offset-2"
          >
            Compare vs. title plant
          </Link>
          <Link
            to="/staff"
            className="ml-auto text-slate-400 hover:text-slate-700 hover:underline underline-offset-2"
          >
            County staff workbench
          </Link>
        </div>
      </footer>
    </main>
  );
}
