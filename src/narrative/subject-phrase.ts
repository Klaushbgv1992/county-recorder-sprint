// src/narrative/subject-phrase.ts
import type { Party } from "../types";
import type { z } from "zod";
import type { PartyRole } from "../schemas";

type Role = z.infer<typeof PartyRole>;

const ENTITY_SUFFIXES = [
  // order matters — longer matches first
  /,\s*L\.L\.C\.?\s*$/i,
  /\bL\.L\.C\.?\s*$/i,
  /\bLLC\.?\s*$/i,
  /\bINC\.?\s*$/i,
  /\bCORP\.?\s*$/i,
  /\bCORPORATION\s*$/i,
  /,\s*L\.P\.?\s*$/i,
  /\bL\.P\.?\s*$/i,
  /\bLLP\.?\s*$/i,
  /\bLP\s*$/i,
  /\bCO\.?\s*$/i,
  /\bCOMPANY\s*$/i,
  /\bPARTNERSHIP\s*$/i,
  /\bESTATE\s+OF\b/i,
  /\bESTATE\s*$/i,
  /\bN\.A\.\s*$/i,
  /\bBANK\b/i,
  /\bTRUST\b/i,
  /\bTRUSTEE\b/i,
];

export function isEntityName(name: string): boolean {
  return ENTITY_SUFFIXES.some((re) => re.test(name));
}

// Acronyms that stay ALL-CAPS in display (opaque legal/financial abbreviations).
const PRESERVE_ACRONYMS = new Set([
  "LLC", "L.L.C.", "LP", "L.P.", "LLP", "N.A.", "USA", "LTD", "LTD.",
  "MERS",
]);

// Business-type words that look like acronyms but should be title-cased (e.g. "Inc.").
const ALWAYS_TITLE_CASE = new Set([
  "INC", "CORP", "CO", "COMPANY", "PARTNERSHIP", "CORPORATION", "ESTATE",
  "TRUST", "TRUSTEE", "BANK", "BANK,",
]);

// Connector words (grammatical) — should be lowercased mid-string by titleCaseFreeform.
// Exclude single-letter words ("A") to avoid mangling initials like "N.A.".
const CONNECTORS = new Set(["AND", "OF", "THE", "FOR", "AN", "OR", "IN", "AT", "BY"]);

function smartTitle(word: string): string {
  if (PRESERVE_ACRONYMS.has(word)) return word;
  if (ALWAYS_TITLE_CASE.has(word)) return word[0] + word.slice(1).toLowerCase();
  if (/^[A-Z]{2,}$/.test(word)) {
    // Special-case "JPMORGAN" style compound capitalizations.
    if (word === "JPMORGAN") return "JPMorgan";
    return word[0] + word.slice(1).toLowerCase();
  }
  if (/^[a-z]/.test(word)) return word[0].toUpperCase() + word.slice(1);
  return word;
}

// Title-case a free-form string, preserving well-known acronyms and the
// internal lowercase connector words ("and", "of", "the" mid-string).
function titleCaseFreeform(s: string): string {
  const tokens = s.split(/(\s+|[,.])/); // keep separators
  return tokens
    .map((tok, i) => {
      if (/^\s+$/.test(tok) || /^[,.]$/.test(tok)) return tok;
      if (i > 0 && CONNECTORS.has(tok.toUpperCase())) return tok.toLowerCase();
      return smartTitle(tok);
    })
    .join("")
    // first visible word should be capitalized even if it's a connector
    .replace(/^([a-z])/, (c) => c.toUpperCase());
}

export function cleanEntityName(raw: string): string {
  // Strip trust trailing ", dated <anything>" tails for display. Provenance
  // is preserved on the underlying field; this is display-only cleanup.
  const noDateTail = raw.replace(/,\s*dated\s+.+$/i, "");
  return titleCaseFreeform(noDateTail);
}

// Assumes curated grantee parties on deeds/DOTs where names are FIRSTNAME-LAST; flat raw_api_response.names (LASTNAME-FIRST) are never passed here.
function lastNameOfIndividual(fullName: string): string {
  // Curated parties data uses "FIRSTNAME LAST" format (e.g. "CHRISTOPHER POPHAM"),
  // so the last whitespace-split token is the surname. Title-case the result.
  const parts = fullName.trim().split(/\s+/);
  return titleCaseWord(parts[parts.length - 1] ?? fullName);
}

function titleCaseWord(word: string): string {
  // Simple title-case for personal names — always title-cases ALL-CAPS words,
  // no acronym preservation (person names are not acronyms).
  if (word.length === 0) return word;
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

function renderIndividual(fullName: string): string {
  // "FIRSTNAME [MIDDLE] LASTNAME" → title-case each token in order.
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return fullName;
  return parts.map(titleCaseWord).join(" ");
}

function renderOne(name: string): string {
  if (isEntityName(name)) return cleanEntityName(name);
  return renderIndividual(name);
}

export function subjectPhraseFromParties(parties: Party[], role: Role): string {
  const names = parties.filter((p) => p.role === role).map((p) => p.name);
  if (names.length === 0) {
    return role === "grantee" ? "the current owners" : "the seller";
  }

  // All parties are individuals (no entities).
  if (names.every((n) => !isEntityName(n))) {
    // Single individual: render their full name.
    if (names.length === 1) return renderOne(names[0]);
    // Multiple individuals: check if they all share the same surname.
    const lastNames = Array.from(new Set(names.map(lastNameOfIndividual)));
    if (lastNames.length === 1) return `the ${lastNames[0]}s`;
    // Different surnames: list them.
    if (names.length === 2) return `${renderOne(names[0])} and ${renderOne(names[1])}`;
    return names.slice(0, -1).map(renderOne).join(", ") + ", and " + renderOne(names[names.length - 1]);
  }

  // Any entities present: render each cleanly, join with "and"/commas.
  const rendered = names.map(renderOne);
  if (rendered.length === 1) return rendered[0];
  if (rendered.length === 2) return `${rendered[0]} and ${rendered[1]}`;
  return rendered.slice(0, -1).join(", ") + ", and " + rendered[rendered.length - 1];
}
