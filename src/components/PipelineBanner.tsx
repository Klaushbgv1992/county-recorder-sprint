import { Link } from "react-router";
import state from "../data/pipeline-state.json";
import {
  currentFreshness,
  type PipelineState,
} from "../logic/pipeline-selectors";

const pipelineState = state as unknown as PipelineState;

export function PipelineBanner() {
  const { index, ocr, curator } = currentFreshness(pipelineState);
  const ocrStage = pipelineState.current.stages.find(
    (s) => s.stage_id === "ocr",
  );
  const docsAwaiting = ocrStage ? ocrStage.docs_behind : 0;

  return (
    <div className="h-10 bg-slate-900 text-slate-100 px-4 flex items-center justify-between text-xs font-mono shrink-0">
      <div className="flex items-center gap-2">
        <span>
          County indexed through <strong className="text-white">{index}</strong>
        </span>
        <span className="text-slate-400">·</span>
        <span>
          OCR'd through <strong className="text-white">{ocr}</strong>
        </span>
        <span className="text-slate-400">·</span>
        <span>
          Curator-verified through{" "}
          <strong className="text-white">{curator}</strong>
        </span>
        <span className="text-slate-400">·</span>
        <span>
          <strong className="text-white">
            {docsAwaiting.toLocaleString()}
          </strong>{" "}
          docs awaiting AI extraction
        </span>
      </div>
      <Link
        to="/pipeline"
        className="hover:text-white underline underline-offset-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moat-500"
      >
        Pipeline →
      </Link>
    </div>
  );
}
