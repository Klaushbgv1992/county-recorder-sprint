export const OVERLAY_NAMES = ["encumbrance", "anomaly", "lastdeed"] as const;
export type OverlayName = (typeof OVERLAY_NAMES)[number];

export function parseOverlayParam(value: string | null): Set<OverlayName> {
  if (!value) return new Set();
  const out = new Set<OverlayName>();
  for (const raw of value.split(",")) {
    const t = raw.trim();
    if ((OVERLAY_NAMES as readonly string[]).includes(t)) {
      out.add(t as OverlayName);
    }
  }
  return out;
}

export function serializeOverlayParam(s: Set<OverlayName>): string {
  return OVERLAY_NAMES.filter((n) => s.has(n)).join(",");
}

export function toggleOverlay(
  s: Set<OverlayName>,
  name: OverlayName,
): Set<OverlayName> {
  const out = new Set(s);
  if (out.has(name)) out.delete(name); else out.add(name);
  return out;
}
