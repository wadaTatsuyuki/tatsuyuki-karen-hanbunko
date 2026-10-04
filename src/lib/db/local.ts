import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Expense, RecurringExpense, Settlement } from "../types";
import type { Db, Throttle } from "./types";

/**
 * 開発用のローカル保存（.data/ 以下の JSON とファイル）。
 * SUPABASE_URL が未設定のときだけ使われる。本番（Vercel）では使えない。
 */
interface State {
  expenses: Expense[];
  recurring: RecurringExpense[];
  generations: string[];
  settlements: Settlement[];
  throttle: Throttle;
}

const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "db.json");
const RECEIPTS = path.join(DIR, "receipts");

let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<State> {
  try {
    return JSON.parse(await readFile(FILE, "utf8"));
  } catch {
    return {
      expenses: [],
      recurring: [],
      generations: [],
      settlements: [],
      throttle: { failures: 0, lockedUntil: null },
    };
  }
}

/** 読み書きを直列化する */
function tx<T>(fn: (s: State) => T | Promise<T>, write = true): Promise<T> {
  const run = queue.then(async () => {
    const s = await load();
    const result = await fn(s);
    if (write) {
      await mkdir(DIR, { recursive: true });
      await writeFile(FILE, JSON.stringify(s, null, 2));
    }
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

const read = <T>(fn: (s: State) => T) => tx(fn, false);

function safeReceiptPath(p: string): string {
  const full = path.join(RECEIPTS, p);
  if (!full.startsWith(RECEIPTS + path.sep)) throw new Error("invalid path");
  return full;
}

export function createLocalDb(): Db {
  return {
    listExpenses: (start, end) =>
      read((s) =>
        s.expenses
          .filter((e) => e.spentOn >= start && e.spentOn <= end)
          .sort(
            (a, b) =>
              b.spentOn.localeCompare(a.spentOn) || b.createdAt.localeCompare(a.createdAt),
          ),
      ),
    getExpense: (id) => read((s) => s.expenses.find((e) => e.id === id) ?? null),
    createExpenses: (items) =>
      tx((s) => {
        const now = new Date().toISOString();
        const created = items.map(
          (e): Expense => ({
            ...e,
            id: randomUUID(),
            recurringId: e.recurringId ?? null,
            createdAt: now,
            updatedAt: now,
          }),
        );
        s.expenses.push(...created);
        return created;
      }),
    updateExpense: (id, input) =>
      tx((s) => {
        const e = s.expenses.find((x) => x.id === id);
        if (e) Object.assign(e, input, { updatedAt: new Date().toISOString() });
      }),
    deleteExpense: (id) =>
      tx((s) => {
        s.expenses = s.expenses.filter((e) => e.id !== id);
      }),
    countExpensesWithReceipt: (p) =>
      read((s) => s.expenses.filter((e) => e.receiptPath === p).length),

    listRecurring: () =>
      read((s) => [...s.recurring].sort((a, b) => a.createdAt.localeCompare(b.createdAt))),
    createRecurring: (input) =>
      tx((s) => {
        s.recurring.push({ ...input, id: randomUUID(), createdAt: new Date().toISOString() });
      }),
    updateRecurring: (id, input) =>
      tx((s) => {
        const r = s.recurring.find((x) => x.id === id);
        if (r) Object.assign(r, input);
      }),
    deleteRecurring: (id) =>
      tx((s) => {
        s.recurring = s.recurring.filter((r) => r.id !== id);
        s.generations = s.generations.filter((g) => !g.startsWith(`${id}:`));
        for (const e of s.expenses) if (e.recurringId === id) e.recurringId = null;
      }),
    claimRecurringGeneration: (id, month) =>
      tx((s) => {
        const key = `${id}:${month}`;
        if (s.generations.includes(key)) return false;
        s.generations.push(key);
        return true;
      }),

    listSettlements: () =>
      read((s) => [...s.settlements].sort((a, b) => b.month.localeCompare(a.month))),
    getSettlement: (month) =>
      read((s) => s.settlements.find((x) => x.month === month) ?? null),
    createSettlement: (st) =>
      tx((s) => {
        if (s.settlements.some((x) => x.month === st.month)) {
          throw new Error("duplicate key value violates unique constraint");
        }
        s.settlements.push(st);
      }),
    deleteSettlement: (month) =>
      tx((s) => {
        s.settlements = s.settlements.filter((x) => x.month !== month);
      }),

    getThrottle: () => read((s) => s.throttle),
    setThrottle: (t) =>
      tx((s) => {
        s.throttle = t;
      }),

    async putReceipt(p, bytes) {
      const full = safeReceiptPath(p);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, bytes);
    },
    async getReceipt(p) {
      try {
        return { bytes: await readFile(safeReceiptPath(p)), contentType: "image/jpeg" };
      } catch {
        return null;
      }
    },
    async deleteReceipt(p) {
      await rm(safeReceiptPath(p), { force: true });
    },
  };
}
