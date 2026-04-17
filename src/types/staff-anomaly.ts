export type AnomalySeverity = "high" | "medium" | "low";

type AnomalyBase = {
  id: string;
  parcel_apn: string;
  severity: AnomalySeverity;
  title: string;
  description: string;
};

export type StaffAnomalyEngine = AnomalyBase & {
  references: [string, ...string[]];
  pattern_id: string;
};

export type StaffAnomalyOverride = AnomalyBase & {
  references: [];
  plain_english: string;
};

export type StaffAnomaly = StaffAnomalyEngine | StaffAnomalyOverride;

export function isEngineAnomaly(a: StaffAnomaly): a is StaffAnomalyEngine {
  return a.references.length > 0;
}
