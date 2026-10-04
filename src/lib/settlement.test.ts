import { describe, expect, it } from "vitest";
import { member1Share, roundSettlement, summarize } from "./settlement";
import type { Expense } from "./types";

type E = Pick<Expense, "amount" | "paidBy" | "splitType" | "splitValue">;
const eq = (amount: number, paidBy: 1 | 2): E => ({
  amount,
  paidBy,
  splitType: "equal",
  splitValue: null,
});

describe("member1Share", () => {
  it("半々", () => {
    expect(member1Share(1001, { splitType: "equal", splitValue: null })).toBe(500.5);
  });
  it("比率", () => {
    expect(member1Share(1000, { splitType: "ratio", splitValue: 60 })).toBe(600);
    expect(member1Share(1000, { splitType: "ratio", splitValue: 150 })).toBe(1000);
  });
  it("金額（総額を超えない）", () => {
    expect(member1Share(1000, { splitType: "amount", splitValue: 300 })).toBe(300);
    expect(member1Share(1000, { splitType: "amount", splitValue: 3000 })).toBe(1000);
  });
});

describe("roundSettlement", () => {
  it("10円単位で切り上げる（受け取る側が得）", () => {
    expect(roundSettlement(1231)).toBe(1240);
    expect(roundSettlement(1230)).toBe(1230);
    expect(roundSettlement(1230.000001)).toBe(1230);
    expect(roundSettlement(0.5)).toBe(10);
    expect(roundSettlement(0)).toBe(0);
  });
});

describe("summarize", () => {
  it("家賃を彼女が立て替えた月の例", () => {
    const s = summarize([
      eq(120000, 2), // 家賃
      eq(5000, 2), // ネット
      eq(40000, 1), // 食費・外食
      eq(10000, 2), // 日用品
    ]);
    expect(s.total).toBe(175000);
    expect(s.paid).toEqual({ 1: 40000, 2: 135000 });
    expect(s.from).toBe(1);
    expect(s.to).toBe(2);
    expect(s.amount).toBe(47500);
  });

  it("全額相手負担（立替・送金）を含む", () => {
    // 1 が 2 の個人的な買い物 3000円を立て替え → 2 が 1 に 3000円
    const s = summarize([
      { amount: 3000, paidBy: 1, splitType: "ratio", splitValue: 0 },
    ]);
    expect(s).toMatchObject({ from: 2, to: 1, amount: 3000 });
  });

  it("月の途中の現金送金で相殺される", () => {
    const s = summarize([
      eq(10000, 2), // 2 が 10000 払った → 1 は 5000 の借り
      // 1 が 2 に 5000 送金（送金は全額 2 の負担として記録）
      { amount: 5000, paidBy: 1, splitType: "ratio", splitValue: 0 },
    ]);
    expect(s).toMatchObject({ from: null, to: null, amount: 0 });
  });

  it("端数は切り上げ", () => {
    const s = summarize([eq(1001, 1), eq(15, 1)]);
    // 2 の負担 = 508 → 510
    expect(s).toMatchObject({ from: 2, to: 1, exactAmount: 508, amount: 510 });
  });

  it("支出なし", () => {
    expect(summarize([])).toMatchObject({ total: 0, amount: 0, from: null });
  });
});
