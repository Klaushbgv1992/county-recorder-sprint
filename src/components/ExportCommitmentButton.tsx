import { useCallback } from "react";
import type {
  Parcel,
  Instrument,
  DocumentLink,
  EncumbranceLifecycle,
  PipelineStatus,
} from "../types";
import type { BIItem, TransactionInputs } from "../types/commitment";
import {
  buildCommitment,
  type CommitmentDocument,
  type ClosingImpactTemplate,
} from "../logic/commitment-builder";
import { renderCommitmentPdf } from "../logic/commitment-pdf";
import closingImpactTemplates from "../data/closing-impact-templates.json";

export interface TriggerInput {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: EncumbranceLifecycle[];
  pipelineStatus: PipelineStatus;
  closingImpactTemplates: ClosingImpactTemplate[];
  generatedAt: string;
  viewedInstrumentNumber?: string;
  biItems?: BIItem[];
  transactionInputs?: TransactionInputs;
  download: (blob: Blob, filename: string) => void;
}

export interface TriggerResult {
  doc: CommitmentDocument;
  blob: Blob;
  filename: string;
}

export function triggerCommitmentDownload(input: TriggerInput): TriggerResult {
  const doc = buildCommitment({
    parcel: input.parcel,
    instruments: input.instruments,
    links: input.links,
    lifecycles: input.lifecycles,
    pipelineStatus: input.pipelineStatus,
    closingImpactTemplates: input.closingImpactTemplates,
    generatedAt: input.generatedAt,
    viewedInstrumentNumber: input.viewedInstrumentNumber,
  });
  const blob = renderCommitmentPdf(doc, {
    biItems: input.biItems,
    transactionInputs: input.transactionInputs,
  });
  const apnNoDashes = input.parcel.apn.replace(/-/g, "");
  const filename = `commitment-${apnNoDashes}-${input.pipelineStatus.verified_through_date}.pdf`;
  input.download(blob, filename);
  return { doc, blob, filename };
}

export function browserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

interface ButtonProps {
  parcel: Parcel;
  instruments: Instrument[];
  links: DocumentLink[];
  lifecycles: EncumbranceLifecycle[];
  pipelineStatus: PipelineStatus;
  viewedInstrumentNumber?: string;
  biItems?: BIItem[];
  transactionInputs?: TransactionInputs;
  label?: string;
}

export function ExportCommitmentButton(props: ButtonProps) {
  const handleClick = useCallback(() => {
    triggerCommitmentDownload({
      parcel: props.parcel,
      instruments: props.instruments,
      links: props.links,
      lifecycles: props.lifecycles,
      pipelineStatus: props.pipelineStatus,
      closingImpactTemplates: closingImpactTemplates as ClosingImpactTemplate[],
      generatedAt: new Date().toISOString(),
      viewedInstrumentNumber: props.viewedInstrumentNumber,
      biItems: props.biItems,
      transactionInputs: props.transactionInputs,
      download: browserDownload,
    });
  }, [
    props.parcel,
    props.instruments,
    props.links,
    props.lifecycles,
    props.pipelineStatus,
    props.viewedInstrumentNumber,
    props.biItems,
    props.transactionInputs,
  ]);

  const cls =
    "px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 transition-colors";
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cls}
      title="Download a PDF chain-and-encumbrance abstract for this parcel"
    >
      {props.label ?? "Export Commitment for Parcel"}
    </button>
  );
}
