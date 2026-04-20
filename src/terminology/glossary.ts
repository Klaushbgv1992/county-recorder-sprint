const GLOSSARY: Record<string, string> = {
  // --- Document types ---
  "chain of title": "Ownership History",
  "encumbrances": "Claims Against Property",
  "encumbrance lifecycles": "Claims Against Property",
  "lifecycle": "Claim Against Property",
  "lifecycles": "Claims Against Property",
  "deed of trust": "Mortgage",
  "full reconveyance": "Mortgage Paid Off",
  "partial reconveyance": "Partial Payoff",
  "warranty deed": "Sale Deed",
  "special warranty deed": "Sale Deed (Limited)",
  "quit claim deed": "Ownership Transfer",
  "grant deed": "Sale Deed",
  "dot": "Mortgage",
  "assignment of dot": "Mortgage Transfer",
  "assignment of deed of trust": "Mortgage Transfer",
  "heloc dot": "Home Equity Loan",
  "heloc deed of trust": "Home Equity Loan",
  "substitution of trustee": "Trustee Change",
  "release": "Mortgage Paid Off",
  "partial release": "Partial Payoff",
  "modification": "Loan Modification",
  "assignment": "Mortgage Transfer",
  "deed": "Sale Deed",
  "mod.": "Loan Modification",
  "ucc-3": "UCC Termination",
  "ucc termination": "UCC Termination",
  "affid.": "Affidavit",
  "sub.t.": "Trustee Change",

  // --- Party roles ---
  "grantor": "Seller",
  "grantee": "Buyer",
  "trustor/borrower": "Borrower",
  "lender": "Lender",
  "releasing party": "Company That Released the Mortgage",

  // --- Field labels ---
  "recording date": "Date Recorded",
  "legal description": "Property Description (Legal)",
  "back references": "Related Prior Documents",
  "extracted fields": "Document Details",
  "additional fields": "More Details",
  "related instruments": "Related Documents",

  // --- Lifecycle status ---
  "open": "Outstanding",
  "released": "Paid Off / Released",
  "unresolved": "Needs Review",
  "possible match": "Possible Match Found",

  // --- Anomaly / findings ---
  "anomaly": "Issue",
  "anomalies": "Issues",
  "evidence": "Supporting Documents",
  "examiner action": "What To Do",
  "examiner review required": "Needs review",

  // --- Pipeline / moat ---
  "county recording pipeline status": "County Document Processing Status",
  "received": "Received",
  "recorded": "Recorded",
  "indexed": "Indexed",
  "verified": "Verified",
  "published": "Published",

  // --- MERS / swimlane ---
  "unrecorded transfer": "Missing Public Record",
  "override status": "Change Status",
  "override": "Change",
  "cross-parcel scan": "Search Across Properties",
  "same-day transaction": "Same-Day Filing",

  // --- Citations ---
  "parcel": "Property",
  "back-reference": "Citation",
  "back-references": "Citations",
  "citation": "Citation",
  "citations": "Citations",
  "cites": "Cites",
  "cited by": "Cited By",
  "inbound references": "Cited By",
  "outbound references": "Cites",

  // --- Proof drawer ---
  "copy citation": "Copy Reference",
  "ai extraction": "AI Data Extraction",
  "mers note": "Mortgage Transfer Note",
  "source": "Source",
};

export function translate(term: string): string {
  return GLOSSARY[term.toLowerCase()] ?? term;
}
