export type TransactionType =
  | "purchase"
  | "refinance"
  | "second_dot"
  | "heloc"
  | "cash_sale";

export interface TransactionInputs {
  transaction_type: TransactionType;
  effective_date: string; // YYYY-MM-DD
  buyer_or_borrower: string;
  new_lender: string | null;
}

export interface BIItem {
  item_id: string;
  text: string;
  why: string;
  template_id: string;
  origin_anomaly_id: string | null;
  origin_lifecycle_id: string | null;
}
