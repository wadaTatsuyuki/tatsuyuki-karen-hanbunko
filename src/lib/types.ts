import type { CategoryId } from "./categories";

export type MemberId = 1 | 2;

/**
 * 負担の分け方。
 * - equal:  半々
 * - ratio:  splitValue = メンバー1の負担割合（%）
 * - amount: splitValue = メンバー1の負担額（円）
 */
export type SplitType = "equal" | "ratio" | "amount";

export interface Split {
  splitType: SplitType;
  splitValue: number | null;
}

export interface Expense extends Split {
  id: string;
  spentOn: string; // YYYY-MM-DD
  title: string;
  amount: number;
  category: CategoryId;
  paidBy: MemberId;
  memo: string | null;
  receiptPath: string | null;
  recurringId: string | null;
  createdBy: MemberId | null;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseInput = Omit<
  Expense,
  "id" | "createdAt" | "updatedAt" | "recurringId" | "createdBy"
>;

export interface RecurringExpense extends Split {
  id: string;
  title: string;
  amount: number;
  category: CategoryId;
  paidBy: MemberId;
  dayOfMonth: number;
  active: boolean;
  createdAt: string;
}

export type RecurringInput = Omit<RecurringExpense, "id" | "createdAt">;

export interface Settlement {
  month: string; // YYYY-MM
  fromMember: MemberId | null;
  toMember: MemberId | null;
  amount: number;
  exactAmount: number;
  settledAt: string;
  settledBy: MemberId | null;
}
