const TZ = "Asia/Tokyo";

/** 日本時間の今日 (YYYY-MM-DD) */
export function todayJST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function currentMonthJST(now: Date = new Date()): string {
  return todayJST(now).slice(0, 7);
}

export function isMonth(s: string | undefined | null): s is string {
  return !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function isDate(s: string | undefined | null): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, "0")}` };
}

/** 月の日数を超える日付は月末に寄せる（例: 31日指定の2月 → 28日） */
export function dateInMonth(month: string, day: number): string {
  const last = Number(monthRange(month).end.slice(8));
  return `${month}-${String(Math.min(Math.max(1, day), last)).padStart(2, "0")}`;
}

export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}年${m}月`;
}

export function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const w = "日月火水木金土"[d.getUTCDay()];
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8))}(${w})`;
}

export function yen(n: number): string {
  return `${Math.round(n).toLocaleString("ja-JP")}円`;
}

/** 端数（0.5円など）もそのまま表示する */
export function yenExact(n: number): string {
  return `${(Math.round(n * 100) / 100).toLocaleString("ja-JP", { maximumFractionDigits: 2 })}円`;
}
