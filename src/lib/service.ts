import "server-only";
import { getDb } from "./db";
import { addMonths, currentMonthJST, dateInMonth, monthRange } from "./month";
import { summarize } from "./settlement";
import type { MemberId } from "./types";

/** 今月分の固定費をまだ登録していなければ登録する（何度呼んでも1回だけ） */
export async function ensureRecurringForMonth(month: string = currentMonthJST()) {
  const db = getDb();
  const templates = await db.listRecurring();
  for (const t of templates) {
    if (!t.active) continue;
    // 登録した月より前にさかのぼって作らない
    if (currentMonthJST(new Date(t.createdAt)) > month) continue;
    if (await db.getSettlement(month)) continue;
    if (!(await db.claimRecurringGeneration(t.id, month))) continue;
    await db.createExpenses([
      {
        spentOn: dateInMonth(month, t.dayOfMonth),
        title: t.title,
        amount: t.amount,
        category: t.category,
        paidBy: t.paidBy,
        splitType: t.splitType,
        splitValue: t.splitValue,
        memo: null,
        receiptPath: null,
        createdBy: null,
        recurringId: t.id,
      },
    ]);
  }
}

export async function getMonthData(month: string) {
  const db = getDb();
  const { start, end } = monthRange(month);
  const [expenses, settlement] = await Promise.all([
    db.listExpenses(start, end),
    db.getSettlement(month),
  ]);
  return { expenses, summary: summarize(expenses), settlement };
}

/** 前月が未精算で、精算すべき支出があれば返す（月初のポップアップ用） */
export async function getPendingSettlement() {
  const month = addMonths(currentMonthJST(), -1);
  const data = await getMonthData(month);
  if (data.settlement || data.expenses.length === 0) return null;
  return { month, summary: data.summary };
}

export class SettledMonthError extends Error {
  constructor(month: string) {
    const [y, m] = month.split("-").map(Number);
    super(`${y}年${m}月は精算済みのため変更できません。設定の精算履歴から取り消すと変更できます。`);
  }
}

export async function assertMonthOpen(date: string) {
  const month = date.slice(0, 7);
  if (await getDb().getSettlement(month)) throw new SettledMonthError(month);
}

export function otherMember(m: MemberId): MemberId {
  return m === 1 ? 2 : 1;
}
