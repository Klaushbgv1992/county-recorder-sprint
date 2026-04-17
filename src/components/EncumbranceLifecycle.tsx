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
import { SwimlaneDiagram } from "./swimlane";
import { Term, TermSection } from "../terminology/Term";

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
}: Props) {
  return (
    <div>
      <TermSection id="encumbrance-heading">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              <Term professional="Encumbrance Lifecycles" />
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {parcel.address} &mdash; APN: <span className="font-mono">{parcel.apn}</span>
            </p>
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
      <p className="text-xs text-gray-400 mt-6 text-right">
        {instruments[0]?.corpus_boundary_note ?? ""}
      </p>
    </div>
  );
}
