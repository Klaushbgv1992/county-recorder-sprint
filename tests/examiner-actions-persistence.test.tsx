import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useExaminerActions } from "../src/hooks/useExaminerActions";
import { loadParcelDataByApn } from "../src/data-loader";
import type { ExaminerAction, LifecycleStatus } from "../src/types";

const POPHAM_APN = "304-78-386";

describe("useExaminerActions persistence", () => {
  beforeEach(() => localStorage.clear());

  it("initializes from localStorage when stored state exists", () => {
    const stored: { linkActions: Record<string, ExaminerAction>; lifecycleOverrides: Record<string, LifecycleStatus> } = {
      linkActions: { "some-link-id": "accepted" as ExaminerAction },
      lifecycleOverrides: { "lc-002": "released" as LifecycleStatus },
    };
    localStorage.setItem(`examiner-actions:${POPHAM_APN}`, JSON.stringify(stored));

    const { links } = loadParcelDataByApn(POPHAM_APN);
    const { result } = renderHook(() => useExaminerActions(links, POPHAM_APN));

    expect(result.current.linkActions["some-link-id"]).toBe("accepted");
    expect(result.current.lifecycleOverrides["lc-002"]).toBe("released");
  });

  it("persists state to localStorage when setLinkAction is called", () => {
    const { links } = loadParcelDataByApn(POPHAM_APN);
    expect(links.length).toBeGreaterThan(0); // guard: POPHAM must have links
    const firstLinkId = links[0].id;
    const { result } = renderHook(() => useExaminerActions(links, POPHAM_APN));
    act(() => {
      result.current.setLinkAction(firstLinkId, "accepted");
    });

    const stored = JSON.parse(
      localStorage.getItem(`examiner-actions:${POPHAM_APN}`) ?? "{}"
    );
    expect(stored.linkActions[firstLinkId]).toBe("accepted");
  });

  it("does not mix state between different APNs", () => {
    const { links } = loadParcelDataByApn(POPHAM_APN);
    const { result } = renderHook(() => useExaminerActions(links, POPHAM_APN));

    act(() => {
      result.current.setLifecycleOverride("lc-001", "open");
    });

    // HOGUE APN should have no persisted state
    expect(localStorage.getItem("examiner-actions:304-77-689")).toBeNull();
    // POPHAM should have it
    expect(localStorage.getItem(`examiner-actions:${POPHAM_APN}`)).not.toBeNull();
  });
});
