import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { reconcileGroups } = await import("./receipt-ai");

describe("reconcileGroups", () => {
  it("合計のずれを最大カテゴリで吸収し、同じカテゴリはまとめる", () => {
    const g = reconcileGroups(1000, [
      { category: "food", amount: 600, items: ["牛乳"] },
      { category: "daily", amount: 300, items: ["洗剤"] },
      { category: "food", amount: 98, items: ["パン"] },
    ]);
    expect(g).toEqual([
      { category: "food", amount: 700, items: ["牛乳", "パン"] },
      { category: "daily", amount: 300, items: ["洗剤"] },
    ]);
  });
  it("内訳が空なら総額をその他に", () => {
    expect(reconcileGroups(500, [])).toEqual([{ category: "other", amount: 500, items: [] }]);
  });
});
