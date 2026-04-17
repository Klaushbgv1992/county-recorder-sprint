import type { NarrativeOverlay } from "./types";
import { NarrativeOverlayFile } from "../schemas";

const OVERLAY_FILES: Record<string, unknown> = {};
const CACHE = new Map<string, NarrativeOverlay | null>();

export function loadOverlayForApn(apn: string): NarrativeOverlay | null {
  if (CACHE.has(apn)) return CACHE.get(apn) ?? null;

  const raw = OVERLAY_FILES[apn];
  if (raw === undefined) {
    CACHE.set(apn, null);
    return null;
  }
  const parsed = NarrativeOverlayFile.safeParse(raw);
  if (!parsed.success) {
    if (typeof console !== "undefined") {
      console.warn(`[narrative] overlay for ${apn} failed schema`, parsed.error);
    }
    CACHE.set(apn, null);
    return null;
  }
  CACHE.set(apn, parsed.data);
  return parsed.data;
}

export function registerOverlay(apn: string, raw: unknown): void {
  CACHE.delete(apn);
  OVERLAY_FILES[apn] = raw;
}
