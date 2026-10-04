import { yen, yenExact } from "./month";
import type { MonthSummary } from "./settlement";
import type { MemberId } from "./types";

export function settlementText(
  s: Pick<MonthSummary, "from" | "to" | "amount" | "exactAmount">,
  names: [string, string],
  me: MemberId,
) {
  if (!s.from || !s.to || s.amount === 0) {
    return { pair: "精算なし", amount: null, detail: "ちょうど半分ずつ払えています" };
  }
  const from = names[s.from - 1];
  const to = names[s.to - 1];
  return {
    pair: `${from} → ${to}`,
    amount: yen(s.amount),
    detail:
      (me === s.from ? `あなたが${to}に渡します` : `${from}からあなたに渡します`) +
      (s.exactAmount !== s.amount ? `（端数調整前 ${yenExact(s.exactAmount)}）` : ""),
  };
}
