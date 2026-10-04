import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CategoryId } from "../categories";
import type {
  Expense,
  ExpenseInput,
  MemberId,
  RecurringExpense,
  RecurringInput,
  Settlement,
  SplitType,
} from "../types";
import type { Db, NewExpense, Throttle } from "./types";

const BUCKET = "receipts";

/* eslint-disable @typescript-eslint/no-explicit-any */
function num(v: any): number | null {
  return v === null || v === undefined ? null : Number(v);
}

function toExpense(r: any): Expense {
  return {
    id: r.id,
    spentOn: r.spent_on,
    title: r.title,
    amount: r.amount,
    category: r.category as CategoryId,
    paidBy: r.paid_by as MemberId,
    splitType: r.split_type as SplitType,
    splitValue: num(r.split_value),
    memo: r.memo,
    receiptPath: r.receipt_path,
    recurringId: r.recurring_id,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toRecurring(r: any): RecurringExpense {
  return {
    id: r.id,
    title: r.title,
    amount: r.amount,
    category: r.category as CategoryId,
    paidBy: r.paid_by as MemberId,
    splitType: r.split_type as SplitType,
    splitValue: num(r.split_value),
    dayOfMonth: r.day_of_month,
    active: r.active,
    createdAt: r.created_at,
  };
}

function toSettlement(r: any): Settlement {
  return {
    month: r.month,
    fromMember: r.from_member,
    toMember: r.to_member,
    amount: r.amount,
    exactAmount: Number(r.exact_amount),
    settledAt: r.settled_at,
    settledBy: r.settled_by,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function expenseRow(e: ExpenseInput) {
  return {
    spent_on: e.spentOn,
    title: e.title,
    amount: e.amount,
    category: e.category,
    paid_by: e.paidBy,
    split_type: e.splitType,
    split_value: e.splitValue,
    memo: e.memo,
    receipt_path: e.receiptPath,
  };
}

function recurringRow(r: RecurringInput) {
  return {
    title: r.title,
    amount: r.amount,
    category: r.category,
    paid_by: r.paidBy,
    split_type: r.splitType,
    split_value: r.splitValue,
    day_of_month: r.dayOfMonth,
    active: r.active,
  };
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export function createSupabaseDb(url: string, serviceKey: string): Db {
  const sb: SupabaseClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async listExpenses(start, end) {
      const data = check(
        await sb
          .from("expenses")
          .select("*")
          .gte("spent_on", start)
          .lte("spent_on", end)
          .order("spent_on", { ascending: false })
          .order("created_at", { ascending: false }),
      );
      return (data ?? []).map(toExpense);
    },
    async getExpense(id) {
      const data = check(await sb.from("expenses").select("*").eq("id", id).maybeSingle());
      return data ? toExpense(data) : null;
    },
    async createExpenses(items) {
      const rows = items.map((e: NewExpense) => ({
        ...expenseRow(e),
        created_by: e.createdBy,
        recurring_id: e.recurringId ?? null,
      }));
      const data = check(await sb.from("expenses").insert(rows).select("*"));
      return (data ?? []).map(toExpense);
    },
    async updateExpense(id, input) {
      check(
        await sb
          .from("expenses")
          .update({ ...expenseRow(input), updated_at: new Date().toISOString() })
          .eq("id", id),
      );
    },
    async deleteExpense(id) {
      check(await sb.from("expenses").delete().eq("id", id));
    },
    async countExpensesWithReceipt(path) {
      const res = await sb
        .from("expenses")
        .select("id", { count: "exact", head: true })
        .eq("receipt_path", path);
      if (res.error) throw new Error(res.error.message);
      return res.count ?? 0;
    },

    async listRecurring() {
      const data = check(
        await sb.from("recurring_expenses").select("*").order("created_at"),
      );
      return (data ?? []).map(toRecurring);
    },
    async createRecurring(input) {
      check(await sb.from("recurring_expenses").insert(recurringRow(input)));
    },
    async updateRecurring(id, input) {
      check(await sb.from("recurring_expenses").update(recurringRow(input)).eq("id", id));
    },
    async deleteRecurring(id) {
      check(await sb.from("recurring_expenses").delete().eq("id", id));
    },
    async claimRecurringGeneration(recurringId, month) {
      const data = check(
        await sb
          .from("recurring_generations")
          .upsert(
            { recurring_id: recurringId, month },
            { onConflict: "recurring_id,month", ignoreDuplicates: true },
          )
          .select("recurring_id"),
      );
      return (data ?? []).length > 0;
    },

    async listSettlements() {
      const data = check(
        await sb.from("settlements").select("*").order("month", { ascending: false }),
      );
      return (data ?? []).map(toSettlement);
    },
    async getSettlement(month) {
      const data = check(
        await sb.from("settlements").select("*").eq("month", month).maybeSingle(),
      );
      return data ? toSettlement(data) : null;
    },
    async createSettlement(s) {
      check(
        await sb.from("settlements").insert({
          month: s.month,
          from_member: s.fromMember,
          to_member: s.toMember,
          amount: s.amount,
          exact_amount: s.exactAmount,
          settled_at: s.settledAt,
          settled_by: s.settledBy,
        }),
      );
    },
    async deleteSettlement(month) {
      check(await sb.from("settlements").delete().eq("month", month));
    },

    async getThrottle(): Promise<Throttle> {
      const data = check(
        await sb.from("auth_throttle").select("*").eq("id", 1).maybeSingle(),
      );
      return { failures: data?.failures ?? 0, lockedUntil: data?.locked_until ?? null };
    },
    async setThrottle(t) {
      check(
        await sb
          .from("auth_throttle")
          .upsert({ id: 1, failures: t.failures, locked_until: t.lockedUntil }),
      );
    },

    async putReceipt(path, bytes, contentType) {
      const { error } = await sb.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType, upsert: false });
      if (error) throw new Error(error.message);
    },
    async getReceipt(path) {
      const { data, error } = await sb.storage.from(BUCKET).download(path);
      if (error || !data) return null;
      return {
        bytes: new Uint8Array(await data.arrayBuffer()),
        contentType: data.type || "image/jpeg",
      };
    },
    async deleteReceipt(path) {
      await sb.storage.from(BUCKET).remove([path]);
    },
  };
}
