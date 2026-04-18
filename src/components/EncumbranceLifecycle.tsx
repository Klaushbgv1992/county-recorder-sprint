import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle as LifecycleType,
  PipelineStatus,
  ExaminerAction,
  LifecycleStatus,
} from "../types";
import type { AnomalyFinding } from "../types/anomaly";
import { MoatBanner } from "./MoatBanner";
import { ExportCommitmentButton } from "./ExportCommitmentButton";
import { PartyJudgmentSweep } from "./PartyJudgmentSweep";
import { SwimlaneDiagram } from "./swimlane";
import { Term, TermSection } from "../terminology/Term";
import { getOpenLiensInSubdivision } from "../logic/subdivision-signals";
import { SubdivisionSignalsCard } from "./SubdivisionSignalsCard";
import { TitleOpinionPanel } from "./TitleOpinionPanel";

interface Props {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: LifecycleType[];
  pipelineStatus: PipelineStatus;
  findings: AnomalyFinding[];
  linkActions: Record<string, ExaminerAction>;
  lifecycleOverrides: Record<string, LifecycleStatus>;
  onSetLinkAction: (linkId: string, action: ExaminerAction) => void;
  onSetLifecycleOverride: (lifecycleId: string, status: LifecycleStatus) => void;
  onOpenDocument: (instrumentNumber: string) => void;
  viewedInstrumentNumber?: string;
  allParcels?: Parcel[];
  allLifecycles?: LifecycleType[];
  allInstruments?: Instrument[];
}

export function EncumbranceLifecycle({
  parcel,
  instruments,
  links,
  lifecycles,
  pipelineStatus,
  findings,
  linkActions,
  lifecycleOverrides,
  onSetLinkAction,
  onSetLifecycleOverride,
  onOpenDocument,
  viewedInstrumentNumber,
  allParcels,
  allLifecycles,
  allInstruments,
}: Props) {
  const signals =
    allParcels && allLifecycles && allInstruments
      ? getOpenLiensInSubdivision(
          parcel.subdivision,
          parcel.apn,
          allParcels,
          allLifecycles,
          allInstruments,
        )
      : [];

  return (
    <div>
      <TermSection id="encumbrance-heading">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold text-recorder-900 tracking-tight">
              {parcel.address}, {parcel.city} {parcel.state}
            </h1>
            <div className="flex items-center gap-3 flex-wrap mt-2">
              <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-[0.12em]">
                <Term professional="Encumbrance Lifecycles" />
              </h2>
              <span
                aria-label={`APN ${parcel.apn}`}
                className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700"
              >
                APN {parcel.apn}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <ExportCommitmentButton
              parcel={parcel}
              instruments={instruments}
              links={links}
              lifecycles={lifecycles}
              pipelineStatus={pipelineStatus}
              viewedInstrumentNumber={viewedInstrumentNumber}
            />
          </div>
        </div>
        <MoatBanner pipelineStatus={pipelineStatus} />
      </TermSection>
      <TitleOpinionPanel
        parcel={parcel}
        instruments={instruments}
        lifecycles={lifecycles}
        findings={findings}
        pipelineStatus={pipelineStatus}
      />
      <SubdivisionSignalsCard signals={signals} subdivision={parcel.subdivision} />
      <SwimlaneDiagram
        parcel={parcel}
        instruments={instruments}
        links={links}
        lifecycles={lifecycles}
        pipelineStatus={pipelineStatus}
        findings={findings}
        linkActions={linkActions}
        lifecycleOverrides={lifecycleOverrides}
        onSetLinkAction={onSetLinkAction}
        onSetLifecycleOverride={onSetLifecycleOverride}
        onOpenDocument={onOpenDocument}
      />
      <PartyJudgmentSweep parcel={parcel} onOpenDocument={onOpenDocument} />
      <p className="text-xs text-gray-400 mt-6 text-right">
        {instruments[0]?.corpus_boundary_note ?? ""}
      </p>
    </div>
  );
}
