export type TxType = "expense" | "income" | "investment" | "transfer";

export interface Household {
  id: string;
  name: string;
  currency: string;
  locale: string;
  created_at: string;
}

export interface Profile {
  id: string;
  household_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export interface Category {
  id: string;
  household_id: string;
  name: string;
  type: TxType;
  color: string;
  icon: string;
  monthly_budget: number | null;
  archived: boolean;
  sort_order: number;
}

export interface Transaction {
  id: string;
  household_id: string;
  user_id: string;
  category_id: string;
  type: TxType;
  amount: number;
  occurred_on: string; // YYYY-MM-DD
  note: string | null;
  paid_by: string | null; // profile id
  recurring_id: string | null;
  receipt_url: string | null;
  created_at: string;
}

export interface RecurringRule {
  id: string;
  household_id: string;
  category_id: string;
  type: TxType;
  amount: number;
  note: string | null;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  day_of_month: number | null;
  next_run_on: string;
  active: boolean;
}

export interface InvestmentHolding {
  id: string;
  household_id: string;
  name: string;
  type: string; // MF, Stocks, FD, Gold, Crypto, PF, NPS, Other
  current_value: number;
  invested_value: number;
  last_updated: string;
  notes: string | null;
}
