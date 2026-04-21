export type TransactionType =
  | "purchase"
  | "refinance"
  | "second_dot"
  | "heloc"
  | "cash_sale";

interface TransactionBase {
  transaction_type: TransactionType;
  effective_date: string; // YYYY-MM-DD
}

export interface PurchaseInputs extends TransactionBase {
  transaction_type: "purchase";
  buyers: string;
  sellers: string;
  sale_price: string;
  new_lender: string;
  loan_amount: string;
}

export interface RefinanceInputs extends TransactionBase {
  transaction_type: "refinance";
  borrower: string;
  new_lender: string;
  new_loan_amount: string;
  existing_dot_lifecycle_id: string;
}

export interface SecondDotInputs extends TransactionBase {
  transaction_type: "second_dot";
  borrower: string;
  new_lender: string;
  loan_amount: string;
  first_position_lifecycle_id: string;
}

export interface HelocInputs extends TransactionBase {
  transaction_type: "heloc";
  borrower: string;
  new_lender: string;
  credit_limit: string;
  first_position_lifecycle_id: string;
  existing_heloc_lifecycle_id: string | null;
}

export interface CashSaleInputs extends TransactionBase {
  transaction_type: "cash_sale";
  buyers: string;
  sellers: string;
  sale_price: string;
}

export type TransactionInputs =
  | PurchaseInputs
  | RefinanceInputs
  | SecondDotInputs
  | HelocInputs
  | CashSaleInputs;

export function getBuyerOrBorrower(inputs: TransactionInputs): string {
  switch (inputs.transaction_type) {
    case "purchase":
    case "cash_sale":
      return inputs.buyers;
    case "refinance":
    case "second_dot":
    case "heloc":
      return inputs.borrower;
  }
}

export function getNewLender(inputs: TransactionInputs): string | null {
  switch (inputs.transaction_type) {
    case "cash_sale":
      return null;
    case "purchase":
    case "refinance":
    case "second_dot":
    case "heloc":
      return inputs.new_lender;
  }
}

export interface BIItem {
  item_id: string;
  text: string;
  why: string;
  template_id: string;
  origin_anomaly_id: string | null;
  origin_lifecycle_id: string | null;
}
