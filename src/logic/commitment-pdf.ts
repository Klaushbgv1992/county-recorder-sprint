import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { CommitmentDocument, ScheduleB2Row } from "./commitment-builder";
import { formatProvenanceTag } from "./format-provenance-tag";
import type { BIItem, TransactionInputs } from "../types/commitment";

const MARGIN_X = 14;
const PAGE_WIDTH_PT = 210;
const HEADING_FONT_SIZE = 14;
const SUBHEADING_FONT_SIZE = 11;
const BODY_FONT_SIZE = 10;
const SMALL_FONT_SIZE = 8;

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  purchase: "Purchase",
  refinance: "Refinance",
  second_dot: "2nd Deed of Trust",
  heloc: "HELOC",
  cash_sale: "Cash Sale",
};

export interface RenderCommitmentPdfOptions {
  biItems?: BIItem[];
  transactionInputs?: TransactionInputs;
}

export function renderCommitmentPdf(
  doc: CommitmentDocument,
  options: RenderCommitmentPdfOptions = {},
): Blob {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  let y = 18;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(HEADING_FONT_SIZE);
  pdf.text("Chain-and-Encumbrance Abstract", MARGIN_X, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(BODY_FONT_SIZE);
  pdf.text(doc.header.countyName, MARGIN_X, y);
  y += 5;
  pdf.text(`APN ${doc.header.parcelApn} \u2014 ${doc.header.parcelAddress}`, MARGIN_X, y);
  y += 5;
  pdf.text(
    `Verified through ${doc.header.verifiedThroughDate} \u2022 Generated ${doc.header.generatedAt}`,
    MARGIN_X,
    y,
  );
  y += 8;

  pdf.setFontSize(SMALL_FONT_SIZE);
  const noteLines = pdf.splitTextToSize(
    doc.header.headerNote,
    PAGE_WIDTH_PT - MARGIN_X * 2,
  );
  pdf.text(noteLines, MARGIN_X, y);
  y += noteLines.length * 4 + 4;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(SUBHEADING_FONT_SIZE);
  pdf.text("Schedule A \u2014 Vesting and Description", MARGIN_X, y);
  y += 4;

  autoTable(pdf, {
    startY: y,
    theme: "grid",
    styles: { fontSize: BODY_FONT_SIZE, cellPadding: 2 },
    head: [["Field", "Value"]],
    headStyles: { fillColor: [240, 240, 240], textColor: 30 },
    body: [
      ["APN", doc.scheduleA.apn],
      ["Subdivision", doc.scheduleA.subdivision],
      [
        "Current Owner",
        `${doc.scheduleA.currentOwner.value} ${formatProvenanceTag(
          doc.scheduleA.currentOwner.provenance,
          doc.scheduleA.currentOwner.confidence,
        )}`,
      ],
      ...(doc.scheduleA.vesting
        ? [
            [
              "Vesting",
              `${doc.scheduleA.vesting.value} ${formatProvenanceTag(
                doc.scheduleA.vesting.provenance,
                doc.scheduleA.vesting.confidence,
              )}`,
            ],
          ]
        : []),
      [
        "Legal Description",
        `${doc.scheduleA.legalDescription.value} ${formatProvenanceTag(
          doc.scheduleA.legalDescription.provenance,
          doc.scheduleA.legalDescription.confidence,
        )}`,
      ],
    ],
    columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: "auto" } },
  });
  y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  if (options.biItems && options.biItems.length > 0) {
    y = renderScheduleBI(pdf, options.biItems, options.transactionInputs, y);
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(SUBHEADING_FONT_SIZE);
  pdf.text("Schedule B-II \u2014 Encumbrances of Record", MARGIN_X, y);
  y += 4;

  for (const row of doc.scheduleB2) {
    if (y > 260) {
      pdf.addPage();
      y = 18;
    }
    y = renderB2Row(pdf, row, y);
    y += 4;
  }

  if (y > 240) {
    pdf.addPage();
    y = 18;
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(SUBHEADING_FONT_SIZE);
  pdf.text("Sources", MARGIN_X, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(SMALL_FONT_SIZE);
  pdf.text(`County API base: ${doc.sources.countyApiBase}`, MARGIN_X, y);
  y += 4;
  if (doc.header.countyAuthoritativeUrls.assessorUrl) {
    pdf.text(
      `Assessor: ${doc.header.countyAuthoritativeUrls.assessorUrl}`,
      MARGIN_X,
      y,
    );
    y += 4;
  }
  y += 2;
  pdf.setFont("helvetica", "bold");
  pdf.text("Per-instrument metadata URLs:", MARGIN_X, y);
  y += 4;
  pdf.setFont("helvetica", "normal");
  for (const entry of doc.sources.perInstrumentMetadataUrls) {
    if (y > 285) {
      pdf.addPage();
      y = 18;
    }
    pdf.text(`${entry.recordingNumber}: ${entry.url}`, MARGIN_X, y);
    y += 4;
  }

  return pdf.output("blob");
}

function renderB2Row(pdf: jsPDF, row: ScheduleB2Row, startY: number): number {
  let y = startY;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(BODY_FONT_SIZE);
  const subtypeTag =
    row.subtype === "subdivision_encumbrance" ? " (subdivision encumbrance)" : "";
  const viewedTag = row.viewedMarker ? "  \u2190 viewed" : "";
  pdf.text(
    `${row.lifecycleId.toUpperCase()} \u2014 ${row.status.toUpperCase()}${subtypeTag}${viewedTag}`,
    MARGIN_X,
    y,
  );
  y += 5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(SMALL_FONT_SIZE);

  const body: string[][] = [];
  body.push([
    rowLabelForRoot(row),
    row.rootInstrument.recordingNumber,
    row.rootInstrument.documentType,
    row.rootInstrument.recordingDate,
    row.rootInstrument.pdfUrl,
  ]);
  for (const child of row.childInstruments) {
    body.push([
      "  release",
      child.recordingNumber,
      child.documentType,
      child.recordingDate,
      child.pdfUrl,
    ]);
  }
  autoTable(pdf, {
    startY: y,
    theme: "grid",
    styles: { fontSize: SMALL_FONT_SIZE, cellPadding: 1.5 },
    head: [["Role", "Recording #", "Type", "Date", "Document URL"]],
    headStyles: { fillColor: [248, 248, 248], textColor: 60 },
    body,
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 26 },
      2: { cellWidth: 32 },
      3: { cellWidth: 22 },
      4: { cellWidth: "auto" },
    },
  });
  y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;

  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(SMALL_FONT_SIZE);
  const ratLines = pdf.splitTextToSize(
    `Rationale: ${row.rationale}`,
    PAGE_WIDTH_PT - MARGIN_X * 2,
  );
  pdf.text(ratLines, MARGIN_X, y);
  y += ratLines.length * 3.5;

  if (row.closingImpact) {
    pdf.setFont("helvetica", "normal");
    const ciLines = pdf.splitTextToSize(
      `Closing impact: ${row.closingImpact}`,
      PAGE_WIDTH_PT - MARGIN_X * 2,
    );
    pdf.text(ciLines, MARGIN_X, y);
    y += ciLines.length * 3.5;
  }

  if (row.parties.length > 0) {
    pdf.setFont("helvetica", "normal");
    const partyLines = row.parties.map(
      (p) =>
        `  ${p.role}: ${p.name} ${formatProvenanceTag(p.provenance, p.confidence)}`,
    );
    const wrapped = pdf.splitTextToSize(
      partyLines.join("\n"),
      PAGE_WIDTH_PT - MARGIN_X * 2,
    );
    pdf.text(wrapped, MARGIN_X, y);
    y += wrapped.length * 3.5;
  }

  return y;
}

function rowLabelForRoot(row: ScheduleB2Row): string {
  if (row.status === "released") return "root (released)";
  return "root";
}

function renderScheduleBI(
  pdf: jsPDF,
  items: BIItem[],
  inputs: TransactionInputs | undefined,
  startY: number,
): number {
  let y = startY;

  if (y > 260) {
    pdf.addPage();
    y = 18;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(SUBHEADING_FONT_SIZE);
  pdf.text("Schedule B-I \u2014 Requirements", MARGIN_X, y);
  y += 5;

  if (inputs) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(SMALL_FONT_SIZE);
    const typeLabel =
      TRANSACTION_TYPE_LABELS[inputs.transaction_type] ?? inputs.transaction_type;
    const summaryParts = [
      `Transaction: ${typeLabel}`,
      `Effective: ${inputs.effective_date}`,
      `Buyer/Borrower: ${inputs.buyer_or_borrower}`,
      `Lender: ${inputs.new_lender ?? "\u2014"}`,
    ];
    const summaryLines = pdf.splitTextToSize(
      summaryParts.join("  \u2022  "),
      PAGE_WIDTH_PT - MARGIN_X * 2,
    );
    pdf.text(summaryLines, MARGIN_X, y);
    y += summaryLines.length * 3.5 + 2;
  } else {
    y += 2;
  }

  items.forEach((item, idx) => {
    if (y > 270) {
      pdf.addPage();
      y = 18;
    }
    const number = idx + 1;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(BODY_FONT_SIZE);
    const itemLines = pdf.splitTextToSize(
      `${number}. ${item.text}`,
      PAGE_WIDTH_PT - MARGIN_X * 2,
    );
    pdf.text(itemLines, MARGIN_X, y);
    y += itemLines.length * 4;

    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(SMALL_FONT_SIZE);
    const whyLines = pdf.splitTextToSize(
      `Why this item: ${item.why}`,
      PAGE_WIDTH_PT - MARGIN_X * 2 - 4,
    );
    pdf.text(whyLines, MARGIN_X + 4, y);
    y += whyLines.length * 3.5 + 3;
  });

  y += 4;
  return y;
}
