import type { Parcel, Instrument } from "../../types";
import type { AnomalyFinding } from "../../types/anomaly";
import { makeFinding } from "./_rule-utils";

/**
 * R6: Root plat unrecoverable via public API.
 *
 * Fires once per subdivision plat instrument present on the parcel. In the
 * Maricopa data model plats carry document_type "other" with
 * document_type_raw === "PLAT MAP" (DocumentType enum has no dedicated
 * subdivision_plat). Per Decision #40 and docs/hunt-log-known-gap-2.md,
 * every plat on this corpus references a parent plat that is not
 * retrievable through the public API.
 */
export function detectR6(
  parcel: Parcel,
  instruments: Instrument[],
): AnomalyFinding[] {
  const findings: AnomalyFinding[] = [];

  for (const inst of instruments) {
    const rawUpper = inst.document_type_raw.toUpperCase();
    if (!rawUpper.includes("PLAT")) continue;

    const docketBook = inst.raw_api_response.docketBook;
    const pageMap = inst.raw_api_response.pageMap;
    const parentRef =
      docketBook > 0 && pageMap > 0
        ? `Book ${docketBook} Page ${pageMap}`
        : "parent plat (book/page not captured)";

    findings.push(
      makeFinding({
        ruleId: "R6",
        parcelApn: parcel.apn,
        evidenceInstruments: [inst.instrument_number],
        confidence: 1.0,
        placeholders: {
          a: inst.instrument_number,
          parent_ref: parentRef,
        },
      }),
    );
  }

  return findings;
}
