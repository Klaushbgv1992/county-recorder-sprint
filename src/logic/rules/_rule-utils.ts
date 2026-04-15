import rulesJson from "../../data/anomaly-rules.json";
import type { AnomalyFinding, Severity } from "../../types/anomaly";

export interface RuleDescriptor {
  rule_id: string;
  name: string;
  version: string;
  severity: Severity;
  title_template: string;
  description_template: string;
  examiner_action_template: string;
}

const rules: RuleDescriptor[] = (rulesJson as { rules: RuleDescriptor[] }).rules;

export function getRuleDescriptor(ruleId: string): RuleDescriptor {
  const rule = rules.find((r) => r.rule_id === ruleId);
  if (!rule) {
    throw new Error(`Unknown rule_id: ${ruleId}`);
  }
  return rule;
}

export function interpolate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => {
    if (key in values) {
      return String(values[key]);
    }
    return `{${key}}`;
  });
}

export interface FindingInputs {
  ruleId: string;
  parcelApn: string;
  evidenceInstruments: string[];
  confidence: number;
  placeholders: Record<string, string | number>;
}

export function makeFinding(input: FindingInputs): AnomalyFinding {
  const rule = getRuleDescriptor(input.ruleId);
  return {
    rule_id: rule.rule_id,
    parcel_apn: input.parcelApn,
    severity: rule.severity,
    title: interpolate(rule.title_template, input.placeholders),
    description: interpolate(rule.description_template, input.placeholders),
    evidence_instruments: input.evidenceInstruments,
    examiner_action: interpolate(
      rule.examiner_action_template,
      input.placeholders,
    ),
    detection_provenance: {
      rule_name: rule.name,
      rule_version: rule.version,
      confidence: input.confidence,
    },
  };
}
