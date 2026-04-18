import { useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import {
  TOUR_PARAM_VALUE,
  nextStep,
  stepByNumber,
  type WalkthroughStep,
} from "./steps";

export interface UseWalkthroughResult {
  active: boolean;
  currentStep: WalkthroughStep | null;
  nextStep: WalkthroughStep | null;
  advance: () => void;
  exit: () => void;
}

/**
 * Reads the `?tour=examiner&step=N` pair from the current URL and exposes
 * navigation helpers that preserve unrelated search params (so landing-page
 * state like `?q=…&overlay=…` is not destroyed when advancing).
 */
export function useWalkthrough(): UseWalkthroughResult {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const active = searchParams.get("tour") === TOUR_PARAM_VALUE;
  const stepParam = searchParams.get("step");
  const stepNum = stepParam ? Number(stepParam) : 0;
  const currentStep: WalkthroughStep | null = active ? stepByNumber(stepNum) : null;
  const next = currentStep ? nextStep(currentStep) : null;

  const advance = useCallback(() => {
    if (next) {
      navigate(next.path);
      return;
    }
    // No next step → treat advance as exit.
    const params = new URLSearchParams(searchParams);
    params.delete("tour");
    params.delete("step");
    const qs = params.toString();
    navigate({ pathname: location.pathname, search: qs ? `?${qs}` : "" });
  }, [next, navigate, searchParams, location.pathname]);

  const exit = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("tour");
    params.delete("step");
    const qs = params.toString();
    navigate({ pathname: location.pathname, search: qs ? `?${qs}` : "" });
  }, [navigate, searchParams, location.pathname]);

  return { active, currentStep, nextStep: next, advance, exit };
}
