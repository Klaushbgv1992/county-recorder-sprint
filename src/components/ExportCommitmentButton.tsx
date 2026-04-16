import { useCallback, useState } from "react";
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
import { Toast, type ToastVariant } from "./Toast";

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

interface ToastState {
  message: string;
  variant: ToastVariant;
}

function deferToNextFrame(cb: () => void): void {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => cb());
  } else {
    setTimeout(cb, 0);
  }
}

export function ExportCommitmentButton(props: ButtonProps) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleClick = useCallback(() => {
    setToast({
      message: `Generating commitment for ${props.parcel.current_owner} \u2014 ${props.parcel.apn}\u2026`,
      variant: "info",
    });
    deferToNextFrame(() => {
      try {
        const { filename } = triggerCommitmentDownload({
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
        setToast({ message: `Downloaded: ${filename}`, variant: "success" });
      } catch (err) {
        setToast({
          message: `Export failed: ${err instanceof Error ? err.message : String(err)}`,
          variant: "success",
        });
      }
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
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cls}
        title="Download a PDF chain-and-encumbrance abstract for this parcel"
      >
        {props.label ?? "Export Commitment for Parcel"}
      </button>
      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </>
  );
}
