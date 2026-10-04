"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRecurring, saveRecurring } from "@/app/actions";
import { CATEGORIES, categoryOf, type CategoryId } from "@/lib/categories";
import { yen } from "@/lib/month";
import { splitLabel } from "@/lib/split-label";
import type { MemberId, RecurringExpense } from "@/lib/types";
import { SplitPicker, splitToState, stateToSplit, type SplitState } from "./split-picker";

interface Draft {
  id: string | null;
  title: string;
  amount: string;
  category: CategoryId;
  paidBy: MemberId;
  split: SplitState;
  dayOfMonth: number;
  active: boolean;
}

function toDraft(r: RecurringExpense | null, me: MemberId): Draft {
  return {
    id: r?.id ?? null,
    title: r?.title ?? "",
    amount: r ? String(r.amount) : "",
    category: r?.category ?? "rent",
    paidBy: r?.paidBy ?? me,
    split: splitToState(r ?? { splitType: "equal", splitValue: null }),
    dayOfMonth: r?.dayOfMonth ?? 1,
    active: r?.active ?? true,
  };
}

export function RecurringManager({
  items,
  names,
  me,
}: {
  items: RecurringExpense[];
  names: [string, string];
  me: MemberId;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    if (!draft) return;
    setError(null);
    start(async () => {
      const r = await saveRecurring(draft.id, {
        title: draft.title,
        amount: Number(draft.amount) || 0,
        category: draft.category,
        paidBy: draft.paidBy,
        ...stateToSplit(draft.split),
        dayOfMonth: draft.dayOfMonth,
        active: draft.active,
      });
      if (!r.ok) return setError(r.error);
      setDraft(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("この固定費を削除しますか？（登録済みの支出は残ります）")) return;
    start(async () => {
      const r = await deleteRecurring(id);
      if (!r.ok) return setError(r.error);
      setDraft(null);
      router.refresh();
    });
  }

  return (
    <div>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-sm">
        {items.length === 0 && (
          <li className="p-4 text-sm text-muted">
            家賃やネット代など、毎月決まった支出を登録すると毎月自動で記録されます
          </li>
        )}
        {items.map((r) => {
          const extra = splitLabel(r.amount, r, names);
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setDraft(toDraft(r, me))}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left ${r.active ? "" : "opacity-50"}`}
              >
                <span className="text-2xl" aria-hidden>
                  {categoryOf(r.category).emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {r.title}
                    {!r.active && <span className="ml-1 text-xs text-muted">（停止中）</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    毎月{r.dayOfMonth}日・{names[r.paidBy - 1]}が支払い
                    {extra && `・${extra}`}
                  </span>
                </span>
                <span className="font-semibold tabular">{yen(r.amount)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {!draft && (
        <button
          type="button"
          onClick={() => setDraft(toDraft(null, me))}
          className="mt-3 w-full rounded-xl border border-dashed border-line py-3 text-sm text-ink-2"
        >
          ＋ 固定費を追加
        </button>
      )}

      {draft && (
        <div className="mt-3 flex flex-col gap-4 rounded-2xl bg-surface p-4 shadow-sm">
          <h3 className="font-bold">{draft.id ? "固定費を編集" : "固定費を追加"}</h3>
          <label className="flex flex-col gap-1 text-sm">
            内容
            <input
              value={draft.title}
              maxLength={100}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="例: 家賃"
              className="rounded-xl border border-line bg-surface px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            金額（円）
            <input
              type="number"
              inputMode="numeric"
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              className="rounded-xl border border-line bg-surface px-3 py-2 text-right tabular"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            カテゴリ
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as CategoryId })}
              className="rounded-xl border border-line bg-surface px-3 py-2"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1 text-sm">
            払う人
            <div className="flex gap-2">
              {([1, 2] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={draft.paidBy === id}
                  onClick={() => setDraft({ ...draft, paidBy: id })}
                  className={`flex-1 rounded-xl border-2 py-2 font-bold ${
                    draft.paidBy === id
                      ? id === 1
                        ? "border-m1 bg-m1-soft"
                        : "border-m2 bg-m2-soft"
                      : "border-line text-ink-2"
                  }`}
                >
                  {names[id - 1]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            負担
            <SplitPicker
              value={draft.split}
              onChange={(split) => setDraft({ ...draft, split })}
              names={names}
              amount={Number(draft.amount) || 0}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            毎月
            <select
              value={draft.dayOfMonth}
              onChange={(e) => setDraft({ ...draft, dayOfMonth: Number(e.target.value) })}
              className="rounded-xl border border-line bg-surface px-3 py-2"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d === 31 ? "末" : d}
                </option>
              ))}
            </select>
            日の支出として記録
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              className="h-5 w-5 accent-[var(--accent)]"
            />
            毎月自動で記録する
          </label>
          <p className="text-xs text-muted">
            毎月はじめてアプリを開いたときに、その月の支出として1回だけ記録されます。金額が変わった月は、ホームの内訳から修正してください。
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setError(null);
              }}
              className="flex-1 rounded-xl border border-line py-2.5 text-ink-2"
            >
              キャンセル
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="flex-1 rounded-xl bg-accent py-2.5 font-bold text-on-accent disabled:opacity-50"
            >
              {pending ? "保存中…" : "保存"}
            </button>
          </div>
          {draft.id && (
            <button
              type="button"
              disabled={pending}
              onClick={() => remove(draft.id!)}
              className="py-1 text-sm text-danger"
            >
              削除する
            </button>
          )}
        </div>
      )}
    </div>
  );
}
