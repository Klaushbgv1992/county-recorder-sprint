const GLOSSARY: Record<string, string> = {
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
  "grantor": "Previous Owner",
  "grantee": "New Owner",
  "dot": "Mortgage",
  "assignment of dot": "Mortgage Transfer",
  "heloc dot": "Home Equity Loan",
  "trustor/borrower": "Borrower",
  "parcel": "property",
};

export function translate(term: string): string {
  return GLOSSARY[term.toLowerCase()] ?? term;
}
