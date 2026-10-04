import { MonthNav } from "@/components/month-nav";
import { TrendChart } from "@/components/trend-chart";
import { requireMember } from "@/lib/auth";
import { categoryOf } from "@/lib/categories";
import { getMembers } from "@/lib/config";
import { getDb } from "@/lib/db";
import { addMonths, currentMonthJST, formatMonth, isMonth, monthRange, yen } from "@/lib/month";

const TREND_MONTHS = 6;

export default async function StatsPage({ searchParams }: PageProps<"/stats">) {
  await requireMember();
  const sp = await searchParams;
  const current = currentMonthJST();
  const month =
    typeof sp.month === "string" && isMonth(sp.month) && sp.month <= current ? sp.month : current;

  const first = addMonths(month, -(TREND_MONTHS - 1));
  const all = await getDb().listExpenses(monthRange(first).start, monthRange(month).end);
  // 送金は生活費ではないので集計から外す
  const spending = all.filter((e) => e.category !== "transfer");
  const thisMonth = spending.filter((e) => e.spentOn.startsWith(month));
  const total = thisMonth.reduce((s, e) => s + e.amount, 0);

  const byCat = new Map<string, number>();
  for (const e of thisMonth) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
  const cats = [...byCat].sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...cats.map(([, v]) => v));

  const points = Array.from({ length: TREND_MONTHS }, (_, i) => {
    const m = addMonths(first, i);
    return {
      month: m,
      label: formatMonth(m),
      total: spending.filter((e) => e.spentOn.startsWith(m)).reduce((s, e) => s + e.amount, 0),
    };
  });
  const prev = points[points.length - 2]?.total ?? 0;
  const delta = total - prev;

  const members = getMembers();
  const paid = members.map((m) => ({
    ...m,
    amount: thisMonth.filter((e) => e.paidBy === m.id).reduce((s, e) => s + e.amount, 0),
  }));

  return (
    <>
      <MonthNav month={month} basePath="/stats" />

      <section className="mt-3 rounded-3xl bg-surface p-5 shadow-sm">
        <p className="text-sm text-muted">ふたりの生活費</p>
        <p className="mt-1 text-4xl font-bold">{yen(total)}</p>
        {prev > 0 && (
          <p className="mt-1 text-sm text-ink-2 tabular">
            前月比 {delta >= 0 ? "+" : "−"}
            {yen(Math.abs(delta))}
          </p>
        )}
        <div className="mt-3 flex gap-4 text-sm text-ink-2 tabular">
          {paid.map((m) => (
            <span key={m.id}>
              <span
                className={`mr-1 inline-block h-2.5 w-2.5 rounded-full ${m.id === 1 ? "bg-m1" : "bg-m2"}`}
              />
              {m.name}が支払い {yen(m.amount)}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-3xl bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-ink-2">カテゴリ別</h2>
        {cats.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">この月の記録はありません</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {cats.map(([id, v]) => {
              const c = categoryOf(id);
              return (
                <li key={id}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span>
                      <span aria-hidden>{c.emoji}</span> {c.label}
                    </span>
                    <span className="tabular">
                      <span className="font-semibold">{yen(v)}</span>
                      <span className="ml-1.5 text-xs text-muted">
                        {Math.round((v / total) * 100)}%
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-2.5">
                    <div
                      className="h-full rounded-r bg-chart"
                      style={{ width: `${(v / maxCat) * 100}%`, minWidth: 2 }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-5 rounded-3xl bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-bold text-ink-2">月ごとの合計</h2>
        <div className="mt-2">
          <TrendChart points={points} selected={month} />
        </div>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs text-muted">表で見る</summary>
          <table className="mt-2 w-full tabular">
            <tbody>
              {points.map((p) => (
                <tr key={p.month} className="border-t border-line">
                  <td className="py-1">{p.label}</td>
                  <td className="py-1 text-right">{yen(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
    </>
  );
}
