// src/components/ParcelDrawer.tsx
//
// Right-side drawer with 4 variant renderings:
//   curated           — full curated parcel with chain/encumbrance CTAs
//   recorder_cached   — recorder-indexed instruments but not curated
//   assessor_only     — assessor GIS record with no recorder instruments
//   not_in_seeded_area — clicked outside seeded polygon area
//
// Shell responsibilities:
//   - Desktop (≥768px): fixed right drawer 420px, Esc closes, focus on close button
//   - Mobile (<768px): bottom-sheet dialog via <BottomSheet/> — backdrop scrim,
//     drag-handle affordance, slide-in animation, close button aria-labeled
//     "Back to map" so existing tests + mobile mental model hold. Pushes a
//     history entry on mount + listens for popstate so hardware-back closes.
//   - role="dialog", aria-modal={isMobile}, aria-label="Parcel details"

import { useEffect, useRef } from "react";
import { Link } from "react-router";
import type { Parcel } from "../types";
import type { AssessorParcel } from "../logic/assessor-parcel";
import { assembleAddress } from "../logic/assessor-parcel";
import type { DrawerVariant } from "../logic/drawer-variant";
import { BottomSheet } from "./BottomSheet";

// ---------------------------------------------------------------------------
// Prop types
// ---------------------------------------------------------------------------

export interface RecentInstrument {
  recording_number: string;
  recording_date: string;
  doc_type: string;
  parties: string[];
}

type DrawerPayload =
  | { parcel: Parcel }
  | {
      polygon: AssessorParcel;
      lastRecordedDate: string;
      lastDocType: string;
      recent_instruments: RecentInstrument[];
    }
  | { polygon: AssessorParcel }
  | null;

export interface ParcelDrawerProps {
  variant: DrawerVariant;
  payload: DrawerPayload;
  onClose: () => void;
  seededCount: number;
  isMobile: boolean;
}

// ---------------------------------------------------------------------------
// Shared atoms
// ---------------------------------------------------------------------------

function ProvenancePill({ label }: { label: string }) {
  return (
    <span className="inline-block text-[10px] rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-500 font-mono">
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Curated variant
// ---------------------------------------------------------------------------

function CuratedBody({ parcel }: { parcel: Parcel }) {
  const apnUrl = parcel.apn.replace(/-/g, "");
  void apnUrl; // used only in URLs; suppress unused-var lint
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
          Owner
        </p>
        <p className="text-sm font-medium text-slate-900">
          {parcel.current_owner}
        </p>
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
          APN
        </p>
        <p className="text-sm font-mono text-slate-800">{parcel.apn}</p>
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
          Address
        </p>
        <p className="text-sm text-slate-800">
          {parcel.address}, {parcel.city}, {parcel.state} {parcel.zip}
        </p>
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
          Subdivision
        </p>
        <p className="text-sm text-slate-800">{parcel.subdivision}</p>
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <Link
          to={`/parcel/${parcel.apn}`}
          className="block w-full rounded-md bg-moat-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-moat-700 focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:outline-none transition-colors"
        >
          Open chain of title &rarr;
        </Link>
        <Link
          to={`/parcel/${parcel.apn}/encumbrances`}
          className="block w-full rounded-md border border-moat-300 bg-white px-4 py-2 text-center text-sm font-medium text-moat-700 hover:bg-moat-50 focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:outline-none transition-colors"
        >
          Open encumbrances &rarr;
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recorder-cached variant
// ---------------------------------------------------------------------------

function RecorderCachedBody({
  polygon,
  lastRecordedDate,
  lastDocType,
  recent_instruments,
}: {
  polygon: AssessorParcel;
  lastRecordedDate: string;
  lastDocType: string;
  recent_instruments: RecentInstrument[];
}) {
  void lastDocType; // surfaced in instruments list; suppress lint
  const address = assembleAddress(polygon);
  const cachedDate = polygon.captured_date;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">
            APN
          </p>
          <p className="text-sm font-mono text-slate-800">{polygon.APN_DASH}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">
            Owner
          </p>
          <p className="text-sm text-slate-800 truncate">
            {polygon.OWNER_NAME ?? "—"}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">
            Address
          </p>
          <p className="text-sm text-slate-800">{address}</p>
          <ProvenancePill label={`Maricopa Assessor · public GIS · cached ${cachedDate}`} />
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">
            Last recorded
          </p>
          <p className="text-sm font-mono text-slate-800">{lastRecordedDate}</p>
        </div>
      </div>

      {recent_instruments.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-700 mb-2">
            Last {recent_instruments.length} recorded instruments
          </p>
          <ul className="flex flex-col gap-2">
            {recent_instruments.map((inst) => (
              <li
                key={inst.recording_number}
                className="rounded border border-slate-100 bg-slate-50 p-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-slate-700 truncate">
                      {inst.recording_number}
                    </p>
                    <p className="text-xs text-slate-600 truncate">
                      {inst.doc_type}
                    </p>
                    {inst.parties.length > 0 && (
                      <p className="text-xs text-slate-500 truncate">
                        {inst.parties.slice(0, 2).join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] font-mono text-slate-400">
                    {inst.recording_date}
                  </span>
                </div>
                <div className="mt-1">
                  <ProvenancePill
                    label={`Maricopa Recorder · cached ${cachedDate}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-slate-500 italic border-t border-slate-100 pt-3">
        This parcel is indexed but not curated in this demo.
      </p>

      <div className="flex flex-col gap-2">
        <Link
          to="/parcel/304-78-386"
          className="block w-full rounded-md bg-moat-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-moat-700 focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:outline-none transition-colors"
        >
          &rarr; See a fully curated parcel: POPHAM (Seville Parcel 3)
        </Link>
        <a
          href="#featured-parcels"
          className="block w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:outline-none transition-colors"
          onClick={(e) => {
            e.preventDefault();
            document
              .getElementById("featured-parcels")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          or browse all 5 curated parcels &darr;
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assessor-only variant
// ---------------------------------------------------------------------------

function AssessorOnlyBody({ polygon }: { polygon: AssessorParcel }) {
  const address = assembleAddress(polygon);
  const cachedDate = polygon.captured_date;

  const rows: Array<{ label: string; value: string }> = [
    { label: "APN", value: polygon.APN_DASH },
    { label: "Owner", value: polygon.OWNER_NAME ?? "—" },
    { label: "Address", value: address },
    { label: "Subdivision", value: polygon.SUBNAME ?? "—" },
    { label: "Lot", value: polygon.LOT_NUM ?? "—" },
    { label: "Parcel size", value: polygon.LAND_SIZE ? `${polygon.LAND_SIZE} sq ft` : "—" },
    { label: "Year built", value: polygon.CONST_YEAR ?? "—" },
    { label: "Last deed #", value: polygon.DEED_NUMBER ?? "—" },
    { label: "Last deed date", value: polygon.DEED_DATE ? new Date(polygon.DEED_DATE).toISOString().slice(0, 10) : "—" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="contents">
            <p className="text-xs text-slate-500 uppercase tracking-wide self-center">
              {label}
            </p>
            <div>
              <p className="text-sm text-slate-800">{value}</p>
              <ProvenancePill
                label={`Maricopa Assessor · public GIS · cached ${cachedDate}`}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500 italic border-t border-slate-100 pt-3">
        This parcel has assessor data only — no recorder instruments are indexed
        for it in this demo. The county recorder system has no direct APN
        bridge; this gap is a core part of the custodial-moat story.
      </p>

      <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-2">
        County-curated data includes the complete assessor record plus all
        recorded instruments. Third-party title plants must license this data
        separately.
      </p>

      <div className="flex flex-col gap-2">
        <Link
          to="/parcel/304-78-386"
          className="block w-full rounded-md bg-moat-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-moat-700 focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:outline-none transition-colors"
        >
          &rarr; See a fully curated parcel: POPHAM (Seville Parcel 3)
        </Link>
        <a
          href="#featured-parcels"
          className="block w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:outline-none transition-colors"
          onClick={(e) => {
            e.preventDefault();
            document
              .getElementById("featured-parcels")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          or browse all 5 curated parcels &darr;
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Not-in-seeded-area variant
// ---------------------------------------------------------------------------

const CURATED_PARCELS: Array<{ apn: string; label: string }> = [
  { apn: "304-78-386", label: "POPHAM — 3674 E Palmer St (Seville Parcel 3)" },
  { apn: "304-77-689", label: "HOGUE — 2715 E Palmer St (Shamrock Estates Ph 2A)" },
  { apn: "304-78-409", label: "Seville Parcel 3 HOA Tract" },
  { apn: "304-78-400", label: "GARCIA — 3670 E Palmer St" },
  { apn: "304-78-385", label: "Adjacent parcel — E Palmer St" },
];

function NotInSeededAreaBody({ seededCount }: { seededCount: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-slate-700">
          Not in the seeded area.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          This prototype covers {seededCount.toLocaleString()} parcels captured
          in the Gilbert / Seville area. The parcel you clicked is outside that
          boundary.
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-slate-700 mb-2">
          Jump to a curated parcel:
        </p>
        <ul className="flex flex-col gap-1">
          {CURATED_PARCELS.map((p) => (
            <li key={p.apn}>
              <Link
                to={`/parcel/${p.apn}`}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-moat-700 hover:bg-moat-50 hover:text-moat-900 transition-colors focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:outline-none"
              >
                <span className="font-mono text-slate-500">{p.apn}</span>
                <span>{p.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shell — focus trap, Esc, mobile history entry
// ---------------------------------------------------------------------------

export function ParcelDrawer({
  variant,
  payload,
  onClose,
  seededCount,
  isMobile,
}: ParcelDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus close button on mount (desktop Esc guard)
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Desktop: Esc closes
  useEffect(() => {
    if (isMobile) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isMobile, onClose]);

  // Mobile: push a history entry so hardware-back / popstate closes the drawer
  useEffect(() => {
    if (!isMobile) return;
    window.history.pushState({ parcelDrawer: true }, "");
    const handler = () => onClose();
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [isMobile, onClose]);

  // Render body based on variant
  function renderBody() {
    switch (variant) {
      case "curated": {
        const p = payload as { parcel: Parcel } | null;
        if (!p) return null;
        return <CuratedBody parcel={p.parcel} />;
      }
      case "recorder_cached": {
        const p = payload as {
          polygon: AssessorParcel;
          lastRecordedDate: string;
          lastDocType: string;
          recent_instruments: RecentInstrument[];
        } | null;
        if (!p) return null;
        return (
          <RecorderCachedBody
            polygon={p.polygon}
            lastRecordedDate={p.lastRecordedDate}
            lastDocType={p.lastDocType}
            recent_instruments={p.recent_instruments}
          />
        );
      }
      case "assessor_only": {
        const p = payload as { polygon: AssessorParcel } | null;
        if (!p) return null;
        return <AssessorOnlyBody polygon={p.polygon} />;
      }
      case "not_in_seeded_area":
        return <NotInSeededAreaBody seededCount={seededCount} />;
      default:
        return null;
    }
  }

  function variantTitle() {
    switch (variant) {
      case "curated":
        return "Curated parcel";
      case "recorder_cached":
        return "Recorder-indexed parcel";
      case "assessor_only":
        return "Assessor record only";
      case "not_in_seeded_area":
        return "Outside seeded area";
      default:
        return "Parcel details";
    }
  }

  // Mobile: slide-up bottom sheet (keeps ~15vh of map visible for spatial
  // context). BottomSheet owns the scrim, slide-in animation, Esc handling,
  // and focuses its own close button on mount — so the `closeButtonRef`
  // declared above is a desktop-only concern.
  if (isMobile) {
    return (
      <BottomSheet
        ariaLabel="Parcel details"
        title={variantTitle()}
        closeButtonLabel="Back to map"
        onClose={onClose}
      >
        {renderBody()}
      </BottomSheet>
    );
  }

  // Desktop: fixed right drawer 420px
  return (
    <div
      role="dialog"
      aria-modal={false}
      aria-label="Parcel details"
      className="fixed right-0 top-0 z-50 flex h-full w-[420px] flex-col border-l border-slate-200 bg-white shadow-xl"
    >
      {/* Desktop header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-medium text-slate-700">{variantTitle()}</h2>
        <button
          ref={closeButtonRef}
          aria-label="Close parcel drawer"
          onClick={onClose}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-moat-500 focus-visible:outline-none"
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">{renderBody()}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CachedNeighborPopup — thin map popup used for recorder-cached parcels
// Exported so tests/parcel-drawer.dom.test.tsx can test it in isolation.
// ---------------------------------------------------------------------------
import { Popup } from "react-map-gl/maplibre";

export interface CachedNeighborPopupProps {
  longitude: number;
  latitude: number;
  apn: string;
  owner: string | null;
  last: string | null; // last recording date, or null if unknown
}

export function CachedNeighborPopup({
  longitude,
  latitude,
  apn,
  owner,
  last,
}: CachedNeighborPopupProps) {
  return (
    <Popup
      longitude={longitude}
      latitude={latitude}
      closeButton={false}
      closeOnClick={false}
      anchor="bottom"
      offset={12}
      maxWidth="200px"
    >
      <div className="w-[180px] py-1 px-1 pointer-events-none">
        <p className="text-xs font-mono text-slate-700">{apn}</p>
        <p className="text-xs text-slate-600 truncate">{owner ?? "—"}</p>
        {last !== null && (
          <p className="text-xs text-slate-500">
            Last: <span className="font-mono">{last}</span>
          </p>
        )}
        <p className="text-xs text-slate-400 mt-1 italic">Recorder index only</p>
      </div>
    </Popup>
  );
}

// ---------------------------------------------------------------------------
// AssessorOnlyPopup — thin map popup used for assessor-only parcels
// Exported so tests can test it in isolation.
// ---------------------------------------------------------------------------

export interface AssessorOnlyPopupProps {
  longitude: number;
  latitude: number;
  apn: string;
  ownerName: string | null;
}

export function AssessorOnlyPopup({
  longitude,
  latitude,
  apn,
  ownerName,
}: AssessorOnlyPopupProps) {
  return (
    <Popup
      longitude={longitude}
      latitude={latitude}
      closeButton={false}
      closeOnClick={false}
      anchor="bottom"
      offset={12}
      maxWidth="200px"
    >
      <div className="w-[180px] py-1 px-1 pointer-events-none">
        <p className="text-xs font-mono text-slate-700">{apn}</p>
        <p className="text-xs text-slate-600 truncate">{ownerName ?? "—"}</p>
        <p className="text-xs text-slate-400 mt-1 italic">Assessor only — no instruments indexed</p>
      </div>
    </Popup>
  );
}
