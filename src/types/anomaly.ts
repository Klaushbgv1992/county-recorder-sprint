export type Severity = "high" | "medium" | "low" | "info";

export interface AnomalyFinding {
  rule_id: string;
  parcel_apn: string;
  severity: Severity;
  title: string;
  description: string;
  evidence_instruments: string[];
  examiner_action: string;
  detection_provenance: {
    rule_name: string;
    rule_version: string;
    confidence: number;
  };
}
