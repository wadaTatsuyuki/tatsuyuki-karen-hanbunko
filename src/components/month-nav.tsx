import Link from "next/link";
import { addMonths, currentMonthJST, formatMonth } from "@/lib/month";

export function MonthNav({ month, basePath }: { month: string; basePath: string }) {
  const current = currentMonthJST();
  const next = addMonths(month, 1);
  const link = (m: string) => (m === current ? basePath : `${basePath}?month=${m}`);
  return (
    <div className="flex items-center justify-between">
      <Link
        href={link(addMonths(month, -1))}
        className="rounded-full px-3 py-2 text-xl text-ink-2"
        aria-label="前の月"
      >
        ‹
      </Link>
      <h1 className="text-lg font-bold">
        {formatMonth(month)}
        {month === current && <span className="ml-2 text-xs font-normal text-muted">今月</span>}
      </h1>
      {next <= current ? (
        <Link href={link(next)} className="rounded-full px-3 py-2 text-xl text-ink-2" aria-label="次の月">
          ›
        </Link>
      ) : (
        <span className="px-3 py-2 text-xl text-line" aria-hidden>
          ›
        </span>
      )}
    </div>
  );
}
