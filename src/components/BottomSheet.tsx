// src/components/BottomSheet.tsx
//
// Mobile-first bottom-sheet dialog: scrim + slide-up panel with drag handle
// and a close button. Parent controls mount/unmount (no `open` prop) — the
// component focuses its close button on mount, animates in, and closes on
// Esc or backdrop tap by calling `onClose`.
//
// Used by:
//   - ParcelDrawer (mobile branch)
//   - OverlayToggles (mobile "Layers" trigger)
//
// Desktop callers should keep their own panel/drawer treatment — this sheet
// is sized and positioned for narrow viewports.

import { useEffect, useRef, useState } from "react";

export interface BottomSheetProps {
  onClose: () => void;
  ariaLabel: string;
  title?: string;
  // Override the close-button's accessible name. ParcelDrawer passes
  // "Back to map" so the existing test + user mental model ("I came from the
  // map, I'm going back to it") still hold after the shell swap.
  closeButtonLabel?: string;
  children: React.ReactNode;
  // Tailwind-compatible max-height value passed via style. "85vh" leaves
  // ~15vh of the map visible so the user keeps spatial context while the
  // sheet is open.
  maxHeight?: string;
}

export function BottomSheet({
  onClose,
  ariaLabel,
  title,
  closeButtonLabel = "Close",
  children,
  maxHeight = "85vh",
}: BottomSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [entered, setEntered] = useState(false);

  // Slide-in animation: render translated on first paint, flip to 0 on the
  // next animation frame so the CSS transition actually fires. Single rAF
  // batches with the paint that just mounted us.
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Focus the close button on mount so a keyboard user (or screen reader
  // virtual cursor) lands inside the dialog.
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Esc closes — standard dialog behavior. Mobile doesn't have a hardware
  // Esc but this keeps the sheet well-behaved for tablets with keyboards
  // and for desktop narrow viewports.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <div
        aria-hidden="true"
        data-testid="bottom-sheet-scrim"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] transition-opacity duration-200 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        style={{ maxHeight }}
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border-t border-slate-200 bg-white shadow-[0_-12px_32px_-8px_rgba(15,23,42,0.25)] transition-transform duration-300 ease-out ${
          entered ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Drag handle — visual affordance only; pointer gestures are
            handled by backdrop tap / close button rather than a custom
            drag listener (keeps the component framework-agnostic). */}
        <div
          aria-hidden="true"
          className="flex shrink-0 items-center justify-center pt-2 pb-1"
        >
          <div className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        <div className="flex shrink-0 items-center justify-between px-4 pb-2">
          <h2 className="text-sm font-medium text-slate-700">{title ?? ""}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={closeButtonLabel}
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
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

        <div className="flex-1 overflow-y-auto border-t border-slate-100 px-4 py-3">
          {children}
        </div>
      </div>
    </>
  );
}
