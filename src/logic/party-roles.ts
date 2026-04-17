import type { Instrument, Party } from "../types";

/**
 * Role-based party accessors for Instrument.parties[].
 *
 * Components call these helpers instead of accessing instrument.parties
 * directly for role-specific lookups. This keeps the Zod schema as source
 * of truth while giving components a clean string[] API.
 *
 * MERS nominee handling (Decision 34):
 *   getBeneficiaries returns both the nominee (MERS — the record beneficiary)
 *   and the principal (e.g. VIP Mortgage — the party MERS acts on behalf of),
 *   MERS first. Components can distinguish by checking the nominee_for field
 *   on the MERS party entry to render "MERS as nominee for VIP Mortgage".
 *
 *   A party with role "nominee" IS the record beneficiary under the MERS
 *   system, so getBeneficiaries includes both role:"beneficiary" and
 *   role:"nominee" parties.
 */

function namesByRole(parties: Party[], role: Party["role"]): string[] {
  return parties.filter((p) => p.role === role).map((p) => p.name);
}

export function getGrantors(instrument: Instrument): string[] {
  return namesByRole(instrument.parties, "grantor");
}

export function getGrantees(instrument: Instrument): string[] {
  return namesByRole(instrument.parties, "grantee");
}

/**
 * Returns beneficiary names: role:"beneficiary" first, then role:"nominee".
 * For a DOT with MERS as nominee for VIP Mortgage, this returns
 * ["MORTGAGE ELECTRONIC REGISTRATION SYSTEMS INC", "V I P MORTGAGE INC"]
 * — MERS first (record beneficiary), principal second.
 *
 * To render "MERS as nominee for VIP", use getPartiesByRole with
 * role "nominee" or "beneficiary" and check nominee_for on each Party.
 */
export function getBeneficiaries(instrument: Instrument): string[] {
  const direct = namesByRole(instrument.parties, "beneficiary");
  const nominees = namesByRole(instrument.parties, "nominee");
  return [...direct, ...nominees];
}

export function getTrustors(instrument: Instrument): string[] {
  return namesByRole(instrument.parties, "trustor");
}

export function getLenders(instrument: Instrument): string[] {
  return namesByRole(instrument.parties, "lender");
}

export function getReleasingParties(instrument: Instrument): string[] {
  return namesByRole(instrument.parties, "releasing_party");
}

/**
 * Low-level accessor for components that need the full Party object
 * (e.g. to read nominee_for, provenance, confidence).
 */
export function getPartiesByRole(
  instrument: Instrument,
  role: Party["role"],
): Party[] {
  return instrument.parties.filter((p) => p.role === role);
}

export function getClaimants(instrument: Instrument): string[] {
  return namesByRole(instrument.parties, "claimant");
}

export function getDebtors(instrument: Instrument): string[] {
  return namesByRole(instrument.parties, "debtor");
}
