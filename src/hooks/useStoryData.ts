import { useMemo } from "react";
import type { StoryPageData } from "../narrative/types";
import type { Parcel, Instrument } from "../types";
import { getStoryMode } from "../narrative/availability";
import { loadOverlayForApn } from "../narrative/overlays";
import { loadCachedNeighborInstruments } from "../narrative/adapter";
import { renderTimeline, renderHero } from "../narrative/engine";
import { loadParcelDataByApn } from "../data-loader";
import parcelsRaw from "../data/parcels.json";
import adjacentRaw from "../data/adjacent-parcels.json";

interface CuratedSlice {
  parcel: Parcel;
  instruments: Instrument[];
}

function partialParcelOrNull(apn: string): CuratedSlice | null {
  const instruments = loadCachedNeighborInstruments(apn);
  if (instruments.length === 0) return null;
  const parcel: Parcel = {
    apn,
    address: `APN ${apn}`,
    city: "Gilbert",
    state: "AZ",
    zip: "",
    legal_description: "",
    current_owner: "",
    type: "residential",
    subdivision: "Seville Parcel 3",
    assessor_url: `https://mcassessor.maricopa.gov/mcs/?q=${apn.replace(/-/g, "")}&mod=pd`,
    instrument_numbers: instruments.map((i) => i.instrument_number),
  };
  return { parcel, instruments };
}

function neighborLinks(apn: string) {
  const all = (parcelsRaw as Array<{ apn: string; address: string }>).map((p) => p);
  const adjacent = (adjacentRaw as { features: Array<{ properties: { APN: string; SITUS_ADDRESS: string } }> }).features;

  const seen = new Set<string>([apn]);
  const results: { apn: string; address: string; mode: "curated" | "partial" }[] = [];

  for (const f of adjacent) {
    const nApn = f.properties.APN;
    if (seen.has(nApn)) continue;
    const mode = getStoryMode(nApn);
    if (!mode) continue;
    results.push({ apn: nApn, address: f.properties.SITUS_ADDRESS, mode });
    seen.add(nApn);
    if (results.length >= 5) break;
  }

  if (results.length < 5) {
    for (const p of all) {
      if (seen.has(p.apn)) continue;
      const mode = getStoryMode(p.apn);
      if (!mode) continue;
      results.push({ apn: p.apn, address: p.address, mode });
      seen.add(p.apn);
      if (results.length >= 5) break;
    }
  }

  return results;
}

export function useStoryData(apn: string): StoryPageData | null {
  return useMemo<StoryPageData | null>(() => {
    const mode = getStoryMode(apn);
    if (!mode) return null;

    let slice: CuratedSlice | null;
    let curatedLifecycles: Array<{ lifecycle_id: string; summary: string }> = [];

    if (mode === "curated") {
      try {
        const data = loadParcelDataByApn(apn);
        slice = { parcel: data.parcel, instruments: data.instruments };

        // Build open-lifecycle summaries using the instruments we already loaded.
        const dateByNumber = new Map(
          data.instruments.map((i) => [i.instrument_number, i.recording_date]),
        );
        curatedLifecycles = data.lifecycles
          .filter((lc) => lc.status === "open")
          .map((lc) => ({
            lifecycle_id: lc.id,
            summary: `Open obligation recorded ${dateByNumber.get(lc.root_instrument) ?? ""}`,
          }));
      } catch {
        return null;
      }
    } else {
      slice = partialParcelOrNull(apn);
    }

    if (!slice) return null;

    const overlay = loadOverlayForApn(apn);

    const ctx = {
      apn,
      mode,
      allInstruments: slice.instruments,
      allLinks: [],
      parcel: slice.parcel,
    };

    const hero = renderHero(slice.parcel, slice.instruments, overlay);
    const timelineBlocks = renderTimeline(slice.instruments, ctx, overlay);

    const subdivisionLine = slice.parcel.subdivision
      ? `Part of ${slice.parcel.subdivision}.`
      : null;

    const overlayWhatThisMeans = overlay?.what_this_means ?? null;
    const whatThisMeans =
      overlayWhatThisMeans ??
      `This is the recorded ownership history of ${slice.parcel.address}, assembled from documents filed at the Maricopa County Recorder. If you're buying, selling, or refinancing, a title examiner would verify this chain against the same documents.`;

    const overlayMoat = overlay?.moat_note ?? null;
    const moatCallout =
      overlayMoat ??
      `A title-plant snapshot would show you the document list above — but the details that live only in each document's pages (legal descriptions, trust names, MERS relationships) come directly from the county's records.`;

    return {
      apn,
      mode,
      parcel: slice.parcel,
      hero,
      timelineBlocks,
      currentlyOpen: curatedLifecycles,
      neighborhood: {
        subdivision_line: subdivisionLine,
        neighbors: neighborLinks(apn),
      },
      whatThisMeans,
      moatCallout,
    };
  }, [apn]);
}
