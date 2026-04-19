// src/hooks/usePortalMode.ts
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";

export type PortalMode = "homeowner" | "examiner";

const STORAGE_KEY = "portalMode";

function readStorage(): PortalMode | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "homeowner" || raw === "examiner" ? raw : null;
}

function readParam(params: URLSearchParams): PortalMode | null {
  const raw = params.get("mode");
  return raw === "homeowner" || raw === "examiner" ? raw : null;
}

export function usePortalMode(): { mode: PortalMode; setMode: (m: PortalMode) => void } {
  const [params, setParams] = useSearchParams();
  const fromUrl = readParam(params);
  const [stored, setStored] = useState<PortalMode | null>(() => readStorage());

  // Keep stored in sync with localStorage when the URL changes persistence intent.
  useEffect(() => {
    if (fromUrl && fromUrl !== stored) {
      window.localStorage.setItem(STORAGE_KEY, fromUrl);
      setStored(fromUrl);
    }
  }, [fromUrl, stored]);

  const mode: PortalMode = fromUrl ?? stored ?? "homeowner";

  const setMode = useCallback((m: PortalMode) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, m);
    }
    setStored(m);
    // Mirror the selection into the URL so the page is a sharable
    // link — the shareable-URL story depends on the query-param
    // reflecting the current persona, not just localStorage.
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("mode", m);
        return next;
      },
      { replace: true },
    );
  }, [setParams]);

  return { mode, setMode };
}
