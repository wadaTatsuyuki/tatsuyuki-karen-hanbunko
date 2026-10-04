import type {
  Expense,
  ExpenseInput,
  MemberId,
  RecurringExpense,
  RecurringInput,
  Settlement,
} from "../types";

export type NewExpense = ExpenseInput & {
  createdBy: MemberId | null;
  recurringId?: string | null;
};

export interface Throttle {
  failures: number;
  lockedUntil: string | null;
}

export interface Db {
  listExpenses(start: string, end: string): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | null>;
  createExpenses(items: NewExpense[]): Promise<Expense[]>;
  updateExpense(id: string, input: ExpenseInput): Promise<void>;
  deleteExpense(id: string): Promise<void>;
  countExpensesWithReceipt(path: string): Promise<number>;

  listRecurring(): Promise<RecurringExpense[]>;
  createRecurring(input: RecurringInput): Promise<void>;
  updateRecurring(id: string, input: RecurringInput): Promise<void>;
  deleteRecurring(id: string): Promise<void>;
  /** その月の固定費をまだ登録していなければ記録して true を返す */
  claimRecurringGeneration(recurringId: string, month: string): Promise<boolean>;

  listSettlements(): Promise<Settlement[]>;
  getSettlement(month: string): Promise<Settlement | null>;
  createSettlement(s: Settlement): Promise<void>;
  deleteSettlement(month: string): Promise<void>;

  getThrottle(): Promise<Throttle>;
  setThrottle(t: Throttle): Promise<void>;

  putReceipt(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  getReceipt(path: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
  deleteReceipt(path: string): Promise<void>;
}
