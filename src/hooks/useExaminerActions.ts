import { useState, useCallback, useEffect, useRef } from "react";
import type { DocumentLink, ExaminerAction, LifecycleStatus } from "../types";

// Note: the S5 plan referenced a separate useLinkActions.ts, but link-action
// state was always consolidated here. No separate hook exists or is needed.

interface ExaminerState {
  linkActions: Record<string, ExaminerAction>;
  lifecycleOverrides: Record<string, LifecycleStatus>;
}

export function useExaminerActions(initialLinks: DocumentLink[], apn: string) {
  const [state, setState] = useState<ExaminerState>(() => {
    const key = `examiner-actions:${apn}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored) as ExaminerState;
      }
    } catch {
      // ignore corrupt storage
    }
    return {
      linkActions: Object.fromEntries(
        initialLinks.map((l) => [l.id, l.examiner_action]),
      ),
      lifecycleOverrides: {},
    };
  });

  const initialized = useRef(false);

  const setLinkAction = useCallback(
    (linkId: string, action: ExaminerAction) => {
      setState((prev) => ({
        ...prev,
        linkActions: { ...prev.linkActions, [linkId]: action },
      }));
    },
    [],
  );

  const setLifecycleOverride = useCallback(
    (lifecycleId: string, status: LifecycleStatus) => {
      setState((prev) => ({
        ...prev,
        lifecycleOverrides: {
          ...prev.lifecycleOverrides,
          [lifecycleId]: status,
        },
      }));
    },
    [],
  );

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return; // skip writing back the value we just read on mount
    }
    const key = `examiner-actions:${apn}`;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore storage errors (private browsing, quota exceeded)
    }
  }, [apn, state]);

  return {
    linkActions: state.linkActions,
    lifecycleOverrides: state.lifecycleOverrides,
    setLinkAction,
    setLifecycleOverride,
  };
}
