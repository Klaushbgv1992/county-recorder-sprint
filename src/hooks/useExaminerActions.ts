import { useState, useCallback } from "react";
import type { DocumentLink, ExaminerAction, LifecycleStatus } from "../types";

interface ExaminerState {
  linkActions: Record<string, ExaminerAction>;
  lifecycleOverrides: Record<string, LifecycleStatus>;
}

export function useExaminerActions(initialLinks: DocumentLink[]) {
  const [state, setState] = useState<ExaminerState>(() => ({
    linkActions: Object.fromEntries(
      initialLinks.map((l) => [l.id, l.examiner_action]),
    ),
    lifecycleOverrides: {},
  }));

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

  return {
    linkActions: state.linkActions,
    lifecycleOverrides: state.lifecycleOverrides,
    setLinkAction,
    setLifecycleOverride,
  };
}
