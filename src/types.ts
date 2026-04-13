import { z } from "zod";
import {
  Parcel,
  Instrument,
  Party,
  OwnerPeriod,
  DocumentLink,
  EncumbranceLifecycle,
  PipelineStatus,
  FieldWithProvenance,
  LifecycleStatus,
  ExaminerAction,
  DocumentType,
  LinkType,
  ProvenanceKind,
  PartyRole,
  RawApiResponse,
} from "./schemas";

export type Parcel = z.infer<typeof Parcel>;
export type Instrument = z.infer<typeof Instrument>;
export type Party = z.infer<typeof Party>;
export type OwnerPeriod = z.infer<typeof OwnerPeriod>;
export type DocumentLink = z.infer<typeof DocumentLink>;
export type EncumbranceLifecycle = z.infer<typeof EncumbranceLifecycle>;
export type PipelineStatus = z.infer<typeof PipelineStatus>;
export type FieldWithProvenance = z.infer<typeof FieldWithProvenance>;
export type LifecycleStatus = z.infer<typeof LifecycleStatus>;
export type ExaminerAction = z.infer<typeof ExaminerAction>;
export type DocumentType = z.infer<typeof DocumentType>;
export type LinkType = z.infer<typeof LinkType>;
export type ProvenanceKind = z.infer<typeof ProvenanceKind>;
export type PartyRole = z.infer<typeof PartyRole>;
export type RawApiResponse = z.infer<typeof RawApiResponse>;
