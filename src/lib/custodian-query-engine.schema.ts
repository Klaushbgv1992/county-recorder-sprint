import { z } from "zod";

export const IndexIdSchema = z.enum(["mcr-name", "mcsc-civil"]);
// DeadEnd ids are a free-form string (not an enum) so the MCSC-dropped
// fallback can list `mcsc-civil` as a dead-end. The ids are display keys,
// not tooling keys — nothing in the engine or UI branches on specific values.
export const DeadEndIdSchema = z.string().min(1);
export const ApproachSchema = z.enum(["public-api", "county-internal"]);

export const AiJudgmentSchema = z.enum([
  "probable_false_positive",
  "requires_examiner_review",
  "confirmed_exposure",
]);

export const FailureKindSchema = z.enum([
  "cloudflare_challenge",
  "http_403",
  "filter_silently_dropped",
  "pagination_broken",
  "viewstate_required",
  "captcha_required",
  "paywall",
  "no_public_search",
]);

export const ProvenanceSchema = z.enum([
  "county_internal_index",
  "state_index_feed",
  "federal_index_feed",
  "manual_entry",
]);

export const HitSchema = z.object({
  id: z.string().min(1),
  party_name: z.string().min(1),
  recording_number: z.string().optional(),
  recording_date: z.string().optional(),
  doc_type_raw: z.string().optional(),
  summary: z.string().min(1),
  ai_judgment: AiJudgmentSchema,
  ai_rationale: z.string().min(1),
  confidence: z.number().min(0).max(1),
  provenance: ProvenanceSchema,
  action_required: z.string(),
});

export const FailureModeSchema = z.object({
  kind: FailureKindSchema,
  http_status: z.number().int().optional(),
  message: z.string().min(1),
  captured_url: z.string().url().optional(),
  captured_response_excerpt: z.string().optional(),
});

export const QueryResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("hit"), hits: z.array(HitSchema).min(1) }),
  z.object({ status: z.literal("zero") }),
  z.object({ status: z.literal("blocked"), failure: FailureModeSchema }),
  z.object({
    status: z.literal("no_capture_available"),
    reason: z.string().min(1),
    what_production_would_do: z.string().min(1),
  }),
]);

export const LiveIndexMetaSchema = z.object({
  id: IndexIdSchema,
  name: z.string().min(1),
  short: z.string().min(1),
  custodian: z.string().min(1),
  coverage: z.string().min(1),
});

export const DeadEndIndexSchema = z.object({
  id: DeadEndIdSchema,
  name: z.string().min(1),
  reason: z.string().min(1),
});

export const SweepSummarySchema = z.object({
  parties_scanned: z.number().int().nonnegative(),
  indexes_scanned: z.number().int().nonnegative(),
  raw_hits: z.number().int().nonnegative(),
  post_judgment_hits_requiring_action: z.number().int().nonnegative(),
  all_clear: z.boolean(),
  all_clear_after_judgment: z.boolean(),
  note: z.string(),
});

export const ParcelSweepSchema = z.discriminatedUnion("status", [
  z.object({
    apn: z.string().min(1),
    status: z.literal("swept"),
    parties: z.array(z.string()),
    indexes: z.array(IndexIdSchema),
    hits: z.array(HitSchema),
    summary: SweepSummarySchema,
    verified_through: z.string(),
    swept_at: z.string(),
  }),
  z.object({
    apn: z.string().min(1),
    status: z.literal("no_capture_available"),
    parties: z.array(z.string()),
    reason: z.string().min(1),
    what_production_would_do: z.string().min(1),
  }),
]);

export const FixtureSchema = z.object({
  schema_version: z.literal(1),
  captured_at: z.string().datetime({ offset: true }),
  capture_duration_ms: z.number().int().nonnegative(),
  operator_notes: z.string().optional(),
  parties: z.array(z.string().min(1)).length(5),
  live_indexes: z.array(LiveIndexMetaSchema).min(1).max(2),
  dead_ends: z.array(DeadEndIndexSchema),
  cells: z.record(z.string(), QueryResultSchema),
  parcel_sweeps: z.record(z.string(), ParcelSweepSchema),
});

export type Fixture = z.infer<typeof FixtureSchema>;
export type IndexId = z.infer<typeof IndexIdSchema>;
export type DeadEndId = z.infer<typeof DeadEndIdSchema>;
export type Approach = z.infer<typeof ApproachSchema>;
export type AiJudgment = z.infer<typeof AiJudgmentSchema>;
export type FailureKind = z.infer<typeof FailureKindSchema>;
export type Provenance = z.infer<typeof ProvenanceSchema>;
export type Hit = z.infer<typeof HitSchema>;
export type FailureMode = z.infer<typeof FailureModeSchema>;
export type QueryResult = z.infer<typeof QueryResultSchema>;
export type LiveIndexMeta = z.infer<typeof LiveIndexMetaSchema>;
export type DeadEndIndex = z.infer<typeof DeadEndIndexSchema>;
export type SweepSummary = z.infer<typeof SweepSummarySchema>;
export type ParcelSweep = z.infer<typeof ParcelSweepSchema>;
