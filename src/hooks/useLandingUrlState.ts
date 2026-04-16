import { useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router";
import {
  parseOverlayParam,
  serializeOverlayParam,
  toggleOverlay as toggleOverlayHelper,
  type OverlayName,
} from "../logic/overlay-state";

export function useLandingUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();

  // react-router v7 setSearchParams functional form does not queue — multiple
  // same-tick calls each read from the same render-snapshot. We accumulate
  // mutations in a ref so that consecutive synchronous calls within one act()
  // all build on the same working copy.
  const pendingRef = useRef<URLSearchParams | null>(null);

  const query = searchParams.get("q") ?? "";
  const selectedApn = searchParams.get("apn");
  const overlays = useMemo(
    () => parseOverlayParam(searchParams.get("overlay")),
    [searchParams],
  );

  const mutate = useCallback(
    (fn: (p: URLSearchParams) => void) => {
      if (!pendingRef.current) {
        pendingRef.current = new URLSearchParams(searchParams);
      }
      fn(pendingRef.current);
      const snapshot = new URLSearchParams(pendingRef.current);
      setSearchParams(snapshot);
      // Clear on next microtask so the ref survives same-tick batching but
      // resets before the next independent interaction.
      queueMicrotask(() => {
        pendingRef.current = null;
      });
    },
    [searchParams, setSearchParams],
  );

  const setQuery = useCallback(
    (q: string) => mutate((p) => {
      if (q) p.set("q", q); else p.delete("q");
    }),
    [mutate],
  );

  const setSelectedApn = useCallback(
    (apn: string | null) => mutate((p) => {
      if (apn) p.set("apn", apn); else p.delete("apn");
    }),
    [mutate],
  );

  const toggleOverlay = useCallback(
    (name: OverlayName) => mutate((p) => {
      const next = toggleOverlayHelper(parseOverlayParam(p.get("overlay")), name);
      const ser = serializeOverlayParam(next);
      if (ser) p.set("overlay", ser); else p.delete("overlay");
    }),
    [mutate],
  );

  return { query, selectedApn, overlays, setQuery, setSelectedApn, toggleOverlay };
}
