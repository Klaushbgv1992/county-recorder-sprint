import { createContext, useContext, useRef, type ReactNode } from "react";
import { useTerminology } from "./TerminologyContext";

const SectionCtx = createContext<Set<string> | null>(null);

export function TermSection({ id: _id, children }: { id: string; children: ReactNode }) {
  const seenRef = useRef(new Set<string>());
  return <SectionCtx value={seenRef.current}>{children}</SectionCtx>;
}

export function Term({ professional }: { professional: string }) {
  const { mode, t } = useTerminology();
  const seen = useContext(SectionCtx);

  if (mode === "professional") {
    return <>{professional}</>;
  }

  const translated = t(professional);
  const isTranslated = translated !== professional;
  const showHint = isTranslated && seen !== null && !seen.has(professional.toLowerCase());

  // Render-phase mutation: safe in this prototype because re-render only
  // causes a duplicate add (idempotent on Set). Under concurrent React,
  // an aborted render could mark the term "seen" prematurely — move to
  // useEffect if concurrent features are adopted.
  if (showHint) {
    seen!.add(professional.toLowerCase());
  }

  return (
    <>
      {translated}
      {showHint && (
        <span
          className="inline-flex items-center justify-center w-3.5 h-3.5 ml-1 rounded-full bg-gray-200 text-gray-500 text-[10px] leading-none cursor-help align-middle"
          title={`Professional term: ${professional}`}
        >
          ?
        </span>
      )}
    </>
  );
}
