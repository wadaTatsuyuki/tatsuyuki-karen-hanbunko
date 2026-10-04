import Link from "next/link";
import { MonthNav } from "@/components/month-nav";
import { SettleButton } from "@/components/settle-button";
import { SettlementPrompt } from "@/components/settlement-prompt";
import { requireMember } from "@/lib/auth";
import { categoryOf } from "@/lib/categories";
import { getMembers } from "@/lib/config";
import { currentMonthJST, formatDay, formatMonth, isMonth, yen, yenExact } from "@/lib/month";
import { ensureRecurringForMonth, getMonthData, getPendingSettlement } from "@/lib/service";
import { settlementText } from "@/lib/settlement-text";
import { splitLabel } from "@/lib/split-label";
import type { Expense } from "@/lib/types";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const me = await requireMember();
  const sp = await searchParams;
  const current = currentMonthJST();
  const month =
    typeof sp.month === "string" && isMonth(sp.month) && sp.month <= current ? sp.month : current;

  await ensureRecurringForMonth(current);
  const [{ expenses, summary, settlement }, pending] = await Promise.all([
    getMonthData(month),
    getPendingSettlement(),
  ]);
  const members = getMembers();
  const names: [string, string] = [members[0].name, members[1].name];

  // 精算済みなら記録した時点の金額を表示する
  const shown = settlement
    ? {
        from: settlement.fromMember,
        to: settlement.toMember,
        amount: settlement.amount,
        exactAmount: settlement.exactAmount,
      }
    : summary;
  const text = settlementText(shown, names, me);
  const pendingText = pending && settlementText(pending.summary, names, me);

  const byDay = new Map<string, Expense[]>();
  for (const e of expenses) byDay.set(e.spentOn, [...(byDay.get(e.spentOn) ?? []), e]);

  return (
    <>
      {pending && pendingText && (
        <SettlementPrompt
          month={pending.month}
          monthLabel={formatMonth(pending.month)}
          pair={pendingText.pair}
          amount={pendingText.amount}
          detail={pendingText.detail}
        />
      )}

      <MonthNav month={month} basePath="/" />

      <section className="mt-3 rounded-3xl bg-surface p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted">
            {month === current ? "今月の精算（見込み）" : "精算"}
          </p>
          {settlement && (
            <span className="rounded-full bg-good-soft px-2.5 py-0.5 text-xs font-bold text-good">
              ✓ 精算済み
            </span>
          )}
        </div>
        <p className="mt-1 text-lg font-bold">{text.pair}</p>
        {text.amount && <p className="text-4xl font-bold tabular">{text.amount}</p>}
        <p className="mt-0.5 text-sm text-ink-2">{text.detail}</p>

        <table className="mt-4 w-full text-sm tabular">
          <thead>
            <tr className="text-xs text-muted">
              <th className="pb-1 text-left font-normal" />
              <th className="pb-1 text-right font-normal">払った</th>
              <th className="pb-1 text-right font-normal">負担分</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-line">
                <td className="py-1.5">
                  <span
                    className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-full ${m.id === 1 ? "bg-m1" : "bg-m2"}`}
                  />
                  {m.name}
                  {m.id === me && <span className="ml-1 text-xs text-muted">（あなた）</span>}
                </td>
                <td className="py-1.5 text-right">{yen(summary.paid[m.id])}</td>
                <td className="py-1.5 text-right">{yenExact(summary.burden[m.id])}</td>
              </tr>
            ))}
            <tr className="border-t border-line font-bold">
              <td className="py-1.5">合計</td>
              <td className="py-1.5 text-right">{yen(summary.total)}</td>
              <td />
            </tr>
          </tbody>
        </table>

        {settlement && settlement.amount !== summary.amount && (
          <p className="mt-3 rounded-xl bg-surface-2 p-3 text-xs text-ink-2">
            精算後に支出が変わっています（現在の計算では {yen(summary.amount)}）。
            設定の精算履歴から取り消して精算し直せます。
          </p>
        )}
        {!settlement && month < current && expenses.length > 0 && (
          <div className="mt-4">
            <SettleButton month={month} label={`${formatMonth(month)}　${text.pair}　${text.amount ?? ""}`} />
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold text-ink-2">
          内訳 <span className="font-normal text-muted">{expenses.length}件</span>
        </h2>
        {expenses.length === 0 ? (
          <p className="rounded-2xl bg-surface p-6 text-center text-sm text-muted">
            まだ記録がありません。右下の ＋ から追加しましょう
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {[...byDay].map(([day, items]) => (
              <div key={day}>
                <h3 className="mb-1 px-1 text-xs text-muted">{formatDay(day)}</h3>
                <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-sm">
                  {items.map((e) => {
                    const c = categoryOf(e.category);
                    const extra = splitLabel(e.amount, e, names);
                    return (
                      <li key={e.id}>
                        <Link
                          href={`/expenses/${e.id}`}
                          className="flex items-center gap-3 px-4 py-3 active:bg-surface-2"
                        >
                          <span className="text-2xl" aria-hidden>
                            {c.emoji}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {e.title}
                              {e.receiptPath && (
                                <span className="ml-1 text-xs" aria-label="レシートあり">
                                  🧾
                                </span>
                              )}
                              {e.recurringId && (
                                <span className="ml-1 rounded bg-surface-2 px-1 text-[10px] text-muted">
                                  固定費
                                </span>
                              )}
                            </span>
                            <span className="block text-xs text-muted">
                              <span
                                className={`mr-1 inline-block h-2 w-2 rounded-full ${e.paidBy === 1 ? "bg-m1" : "bg-m2"}`}
                              />
                              {names[e.paidBy - 1]}が支払い・{c.label}
                              {extra && <span className="text-accent">・{extra}</span>}
                            </span>
                          </span>
                          <span className="font-semibold tabular">{yen(e.amount)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {!settlement && (
        <Link
          href={month === current ? "/expenses/new" : `/expenses/new?date=${month}-01`}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-[max(1.25rem,calc(50%-14rem+1.25rem))] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-3xl text-on-accent shadow-lg"
          aria-label="支出を追加"
        >
          ＋
        </Link>
      )}
    </>
  );
}
