import type { Expense, MemberId, Split } from "./types";

/**
 * 端数処理。精算額は10円単位にし、立て替えた側（受け取る側）が得をするよう切り上げる。
 * 精算で払う側が得をするようにしたい場合は "payer" にする（切り捨て）。
 */
export const ROUNDING_UNIT = 10;
export const ROUNDING_FAVORS: "receiver" | "payer" = "receiver";

/** メンバー1の負担額（円、端数あり）。 */
export function member1Share(amount: number, split: Split): number {
  switch (split.splitType) {
    case "ratio": {
      const pct = Math.min(100, Math.max(0, split.splitValue ?? 50));
      return (amount * pct) / 100;
    }
    case "amount":
      return Math.min(amount, Math.max(0, split.splitValue ?? amount / 2));
    default:
      return amount / 2;
  }
}

export function shareOf(member: MemberId, amount: number, split: Split): number {
  const s1 = member1Share(amount, split);
  return member === 1 ? s1 : amount - s1;
}

export function roundSettlement(exact: number): number {
  // 浮動小数点の誤差（例: 1230.0000001）で余計に切り上げないよう、先に銭単位へ丸める
  const v = Math.round(exact * 100) / 100 / ROUNDING_UNIT;
  return (ROUNDING_FAVORS === "receiver" ? Math.ceil(v) : Math.floor(v)) * ROUNDING_UNIT;
}

export interface MonthSummary {
  total: number;
  paid: Record<MemberId, number>;
  burden: Record<MemberId, number>;
  /** 精算: from が to に amount 円渡す。amount が 0 のときは from/to は null。 */
  from: MemberId | null;
  to: MemberId | null;
  exactAmount: number;
  amount: number;
}

type SummaryInput = Pick<Expense, "amount" | "paidBy" | "splitType" | "splitValue">;

export function summarize(expenses: SummaryInput[]): MonthSummary {
  const paid: Record<MemberId, number> = { 1: 0, 2: 0 };
  const burden: Record<MemberId, number> = { 1: 0, 2: 0 };
  for (const e of expenses) {
    paid[e.paidBy] += e.amount;
    const s1 = member1Share(e.amount, e);
    burden[1] += s1;
    burden[2] += e.amount - s1;
  }
  // balance > 0: メンバー1が多く払っている → メンバー2がメンバー1に渡す
  const balance = Math.round((paid[1] - burden[1]) * 100) / 100;
  const exactAmount = Math.abs(balance);
  const amount = roundSettlement(exactAmount);
  const total = paid[1] + paid[2];
  if (amount === 0) {
    return { total, paid, burden, from: null, to: null, exactAmount, amount: 0 };
  }
  return {
    total,
    paid,
    burden,
    from: balance > 0 ? 2 : 1,
    to: balance > 0 ? 1 : 2,
    exactAmount,
    amount,
  };
}
