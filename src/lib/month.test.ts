import { describe, expect, it } from "vitest";
import { addMonths, currentMonthJST, dateInMonth, isDate, monthRange } from "./month";

describe("month helpers", () => {
  it("JST で月を判定する", () => {
    // UTC 2026-10-31 15:30 = JST 2026-11-01 00:30
    expect(currentMonthJST(new Date("2026-10-31T15:30:00Z"))).toBe("2026-11");
  });
  it("月の加減算", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
  });
  it("月末", () => {
    expect(monthRange("2028-02").end).toBe("2028-02-29");
    expect(dateInMonth("2026-02", 31)).toBe("2026-02-28");
  });
  it("日付の検証", () => {
    expect(isDate("2026-02-30")).toBe(false);
    expect(isDate("2026-02-28")).toBe(true);
  });
});
