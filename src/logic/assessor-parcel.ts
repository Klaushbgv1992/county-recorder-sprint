import { z } from "zod";

export const AssessorParcel = z.object({
  APN: z.string(),
  APN_DASH: z.string(),
  OWNER_NAME: z.string().nullable().optional(),
  PHYSICAL_STREET_NUM: z.string().nullable().optional(),
  PHYSICAL_STREET_DIR: z.string().nullable().optional(),
  PHYSICAL_STREET_NAME: z.string().nullable().optional(),
  PHYSICAL_STREET_TYPE: z.string().nullable().optional(),
  PHYSICAL_CITY: z.string().nullable().optional(),
  PHYSICAL_ZIP: z.string().nullable().optional(),
  SUBNAME: z.string().nullable().optional(),
  LOT_NUM: z.string().nullable().optional(),
  DEED_NUMBER: z.string().nullable().optional(),
  DEED_DATE: z.number().nullable().optional(),
  SALE_DATE: z.string().nullable().optional(),
  LAND_SIZE: z.number().nullable().optional(),
  CONST_YEAR: z.string().nullable().optional(),
  Shape_Length: z.number().nullable().optional(),
  Shape_Area: z.number().nullable().optional(),
  source: z.literal("maricopa_assessor_public_gis"),
  source_url: z.string(),
  captured_date: z.string(),
});
export type AssessorParcel = z.infer<typeof AssessorParcel>;

type AddressPieces = Pick<
  AssessorParcel,
  | "PHYSICAL_STREET_NUM" | "PHYSICAL_STREET_DIR" | "PHYSICAL_STREET_NAME"
  | "PHYSICAL_STREET_TYPE" | "PHYSICAL_CITY" | "PHYSICAL_ZIP"
>;

export function assembleAddress(p: AddressPieces): string {
  const street = [
    p.PHYSICAL_STREET_NUM,
    p.PHYSICAL_STREET_DIR,
    p.PHYSICAL_STREET_NAME,
    p.PHYSICAL_STREET_TYPE,
  ]
    .filter((s) => s != null && s !== "")
    .join(" ");
  const cityZip = [p.PHYSICAL_CITY, p.PHYSICAL_ZIP]
    .filter((s) => s != null && s !== "")
    .join(" ");
  return [street, cityZip].filter((s) => s.length > 0).join(", ");
}
