"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertMember } from "@/lib/auth";
import { getMemberPin, getSessionSecret } from "@/lib/config";
import { getDb } from "@/lib/db";
import { isMonth } from "@/lib/month";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session";
import { assertMonthOpen, getMonthData } from "@/lib/service";
import type { ExpenseInput, MemberId, RecurringInput } from "@/lib/types";
import { expenseSchema, firstError, recurringSchema } from "@/lib/validation";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function run(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "エラーが発生しました" };
  }
}

/* ---------- ログイン ---------- */

const MAX_FAILURES = 5;
const LOCK_MINUTES = 5;

function samePin(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function login(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const member = Number(form.get("member")) as MemberId;
  const pin = String(form.get("pin") ?? "");
  if (member !== 1 && member !== 2) return { ok: false, error: "名前を選んでください" };

  const expected = getMemberPin(member);
  if (!expected) {
    return { ok: false, error: "PINが設定されていません（環境変数 MEMBER1_PIN / MEMBER2_PIN）" };
  }

  const db = getDb();
  const throttle = await db.getThrottle();
  if (throttle.lockedUntil && new Date(throttle.lockedUntil) > new Date()) {
    return {
      ok: false,
      error: `何度も間違えたため、しばらくロックしています。${LOCK_MINUTES}分ほど待ってからお試しください`,
    };
  }

  if (!/^\d{4,12}$/.test(pin) || !samePin(pin, expected)) {
    const failures = throttle.failures + 1;
    const locked = failures >= MAX_FAILURES;
    await db.setThrottle({
      failures: locked ? 0 : failures,
      lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
    });
    await new Promise((r) => setTimeout(r, 500));
    return { ok: false, error: "PINが違います" };
  }

  if (throttle.failures > 0 || throttle.lockedUntil) {
    await db.setThrottle({ failures: 0, lockedUntil: null });
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(member, getSessionSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

/* ---------- 支出 ---------- */

async function cleanupReceipt(path: string | null) {
  if (!path) return;
  const db = getDb();
  if ((await db.countExpensesWithReceipt(path)) === 0) await db.deleteReceipt(path);
}

function parseExpense(input: ExpenseInput): ExpenseInput {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) throw new Error(firstError(parsed.error));
  return parsed.data;
}

export async function createExpenses(inputs: ExpenseInput[]): Promise<ActionResult> {
  return run(async () => {
    const me = await assertMember();
    if (inputs.length === 0 || inputs.length > 30) throw new Error("件数が正しくありません");
    const items = inputs.map(parseExpense);
    for (const date of new Set(items.map((i) => i.spentOn))) await assertMonthOpen(date);
    await getDb().createExpenses(items.map((i) => ({ ...i, createdBy: me })));
    revalidatePath("/", "layout");
  });
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<ActionResult> {
  return run(async () => {
    await assertMember();
    const db = getDb();
    const current = await db.getExpense(id);
    if (!current) throw new Error("この支出は削除されています");
    const item = parseExpense(input);
    await assertMonthOpen(current.spentOn);
    await assertMonthOpen(item.spentOn);
    await db.updateExpense(id, item);
    if (current.receiptPath !== item.receiptPath) await cleanupReceipt(current.receiptPath);
    revalidatePath("/", "layout");
  });
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  return run(async () => {
    await assertMember();
    const db = getDb();
    const current = await db.getExpense(id);
    if (!current) return;
    await assertMonthOpen(current.spentOn);
    await db.deleteExpense(id);
    await cleanupReceipt(current.receiptPath);
    revalidatePath("/", "layout");
  });
}

/* ---------- 精算 ---------- */

export async function markSettled(month: string): Promise<ActionResult> {
  return run(async () => {
    const me = await assertMember();
    if (!isMonth(month)) throw new Error("月が正しくありません");
    const { summary, settlement } = await getMonthData(month);
    if (settlement) return;
    await getDb().createSettlement({
      month,
      fromMember: summary.from,
      toMember: summary.to,
      amount: summary.amount,
      exactAmount: summary.exactAmount,
      settledAt: new Date().toISOString(),
      settledBy: me,
    });
    revalidatePath("/", "layout");
  });
}

export async function unsettle(month: string): Promise<ActionResult> {
  return run(async () => {
    await assertMember();
    if (!isMonth(month)) throw new Error("月が正しくありません");
    await getDb().deleteSettlement(month);
    revalidatePath("/", "layout");
  });
}

/* ---------- 固定費 ---------- */

function parseRecurring(input: RecurringInput): RecurringInput {
  const parsed = recurringSchema.safeParse(input);
  if (!parsed.success) throw new Error(firstError(parsed.error));
  return parsed.data;
}

export async function saveRecurring(
  id: string | null,
  input: RecurringInput,
): Promise<ActionResult> {
  return run(async () => {
    await assertMember();
    const item = parseRecurring(input);
    const db = getDb();
    if (id) await db.updateRecurring(id, item);
    else await db.createRecurring(item);
    revalidatePath("/", "layout");
  });
}

export async function deleteRecurring(id: string): Promise<ActionResult> {
  return run(async () => {
    await assertMember();
    await getDb().deleteRecurring(id);
    revalidatePath("/", "layout");
  });
}
