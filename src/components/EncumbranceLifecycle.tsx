import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle as EncumbranceLifecycleType,
  PipelineStatus,
  ExaminerAction,
  LifecycleStatus,
} from "../types";

interface Props {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: EncumbranceLifecycleType[];
  pipelineStatus: PipelineStatus;
  linkActions: Record<string, ExaminerAction>;
  lifecycleOverrides: Record<string, LifecycleStatus>;
  onSetLinkAction: (linkId: string, action: ExaminerAction) => void;
  onSetLifecycleOverride: (lifecycleId: string, status: LifecycleStatus) => void;
  onOpenDocument: (instrumentNumber: string) => void;
}

export function EncumbranceLifecycle({ parcel }: Props) {
  return <div>EncumbranceLifecycle stub — {parcel.apn}</div>;
}
