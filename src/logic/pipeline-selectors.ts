export interface PipelineStage {
  stage_id: string;
  label: string;
  verified_through: string;
  docs_behind: number;
  sla_days: number;
}

export interface PipelineHistoryEntry {
  date: string;
  index_vt: string;
  ocr_vt: string;
  curator_vt: string;
}

export interface PipelineState {
  current: {
    as_of: string;
    stages: PipelineStage[];
  };
  history_30d: PipelineHistoryEntry[];
  plant_lag_reference: {
    vendor: string;
    lag_days_min: number;
    lag_days_max: number;
    source_note: string;
  };
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(a).getTime() - new Date(b).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function referenceDateOf(
  state: PipelineState,
  opts: { referenceDate?: string } | undefined,
): string {
  if (opts?.referenceDate) return opts.referenceDate;
  return state.current.as_of.slice(0, 10);
}

function stageById(state: PipelineState, id: string): PipelineStage {
  const stage = state.current.stages.find((s) => s.stage_id === id);
  if (!stage) throw new Error(`pipeline stage not found: ${id}`);
  return stage;
}

export function currentFreshness(state: PipelineState): {
  index: string;
  ocr: string;
  curator: string;
} {
  return {
    index: stageById(state, "index").verified_through,
    ocr: stageById(state, "ocr").verified_through,
    curator: stageById(state, "curator").verified_through,
  };
}

export function laggingVsPlant(
  state: PipelineState,
  opts?: { referenceDate?: string },
): { days_ahead_of_min_plant_lag: number } {
  const ref = referenceDateOf(state, opts);
  const indexVT = stageById(state, "index").verified_through;
  const countyLag = daysBetween(ref, indexVT);
  const plantMin = state.plant_lag_reference.lag_days_min;
  return { days_ahead_of_min_plant_lag: plantMin - countyLag };
}

export function overSLAStages(
  state: PipelineState,
  opts?: { referenceDate?: string },
): PipelineStage[] {
  const ref = referenceDateOf(state, opts);
  return state.current.stages.filter(
    (s) => daysBetween(ref, s.verified_through) > s.sla_days,
  );
}
