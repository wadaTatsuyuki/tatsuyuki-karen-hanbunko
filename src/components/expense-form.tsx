"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExpenses, deleteExpense, updateExpense } from "@/app/actions";
import { CATEGORIES, categoryOf, type CategoryId } from "@/lib/categories";
import { toJpeg } from "@/lib/image";
import { currentMonthJST, yen } from "@/lib/month";
import type { ReceiptResult } from "@/lib/receipt-ai";
import type { Expense, ExpenseInput, MemberId } from "@/lib/types";
import { SplitPicker, splitToState, stateToSplit, type SplitState } from "./split-picker";

interface Props {
  names: [string, string];
  me: MemberId;
  aiEnabled: boolean;
  defaultDate: string;
  expense?: Expense;
  locked?: boolean;
}

export function ExpenseForm({ names, me, aiEnabled, defaultDate, expense, locked }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [title, setTitle] = useState(expense?.title ?? "");
  const [spentOn, setSpentOn] = useState(expense?.spentOn ?? defaultDate);
  const [category, setCategory] = useState<CategoryId>(expense?.category ?? "food");
  const [paidBy, setPaidBy] = useState<MemberId>(expense?.paidBy ?? me);
  const [split, setSplit] = useState<SplitState>(
    splitToState(expense ?? { splitType: "equal", splitValue: null }),
  );
  const [memo, setMemo] = useState(expense?.memo ?? "");
  const [receiptPath, setReceiptPath] = useState<string | null>(expense?.receiptPath ?? null);
  const [photoStatus, setPhotoStatus] = useState<null | "uploading" | "reading">(null);
  const [ai, setAi] = useState<ReceiptResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const amountNum = Number(amount) || 0;
  const disabled = locked || pending;

  function input(): ExpenseInput {
    return {
      spentOn,
      title,
      amount: amountNum,
      category,
      paidBy,
      ...stateToSplit(split),
      memo: memo || null,
      receiptPath,
    };
  }

  function done() {
    const m = spentOn.slice(0, 7);
    router.push(m === currentMonthJST() ? "/" : `/?month=${m}`);
  }

  function save() {
    setError(null);
    start(async () => {
      const r = expense ? await updateExpense(expense.id, input()) : await createExpenses([input()]);
      if (!r.ok) return setError(r.error);
      done();
    });
  }

  function saveGroups(r: ReceiptResult) {
    setError(null);
    const base = input();
    start(async () => {
      const res = await createExpenses(
        r.groups.map((g) => ({
          ...base,
          title: `${r.title}（${categoryOf(g.category).label}）`,
          amount: g.amount,
          category: g.category,
        })),
      );
      if (!res.ok) return setError(res.error);
      done();
    });
  }

  function remove() {
    if (!expense || !confirm("この支出を削除しますか？")) return;
    start(async () => {
      const r = await deleteExpense(expense.id);
      if (!r.ok) return setError(r.error);
      done();
    });
  }

  async function onPhoto(file: File) {
    setError(null);
    setAi(null);
    try {
      setPhotoStatus("uploading");
      const jpeg = await toJpeg(file);
      const body = new FormData();
      body.append("file", jpeg, "receipt.jpg");
      const up = await fetch("/api/receipts", { method: "POST", body });
      const upJson = await up.json();
      if (!up.ok) throw new Error(upJson.error ?? "アップロードに失敗しました");
      setReceiptPath(upJson.path);

      if (!aiEnabled || expense) return;
      setPhotoStatus("reading");
      const res = await fetch("/api/receipts/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: upJson.path }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "読み取りに失敗しました");
      const r = json as ReceiptResult;
      setAi(r);
      setAmount(String(r.total));
      setTitle(r.title);
      if (r.date && r.date.slice(0, 7) <= currentMonthJST()) setSpentOn(r.date);
      if (r.groups[0]) setCategory(r.groups[0].category);
    } catch (e) {
      setError(e instanceof Error ? e.message : "画像の処理に失敗しました");
    } finally {
      setPhotoStatus(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const memberBtn = (id: MemberId) =>
    `flex-1 rounded-xl border-2 py-2.5 font-bold ${
      paidBy === id
        ? id === 1
          ? "border-m1 bg-m1-soft"
          : "border-m2 bg-m2-soft"
        : "border-line bg-surface text-ink-2"
    }`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="flex flex-col gap-5"
    >
      {locked && (
        <p className="rounded-xl bg-surface-2 p-3 text-sm text-ink-2">
          この月は精算済みのため変更できません。設定の精算履歴から取り消すと変更できます。
        </p>
      )}

      {/* レシート */}
      <section className="rounded-2xl bg-surface p-4 shadow-sm">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
        />
        {receiptPath ? (
          <div className="flex items-center gap-3">
            <a href={`/api/receipts/${receiptPath}`} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- 認証付き API から配信するため */}
              <img
                src={`/api/receipts/${receiptPath}`}
                alt="レシート"
                className="h-20 w-16 rounded-lg border border-line object-cover"
              />
            </a>
            <div className="flex flex-1 flex-col items-start gap-1">
              <button
                type="button"
                disabled={disabled || !!photoStatus}
                onClick={() => fileRef.current?.click()}
                className="text-sm text-accent"
              >
                撮り直す
              </button>
              <button
                type="button"
                disabled={disabled || !!photoStatus}
                onClick={() => {
                  setReceiptPath(null);
                  setAi(null);
                }}
                className="text-sm text-muted"
              >
                写真を外す
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled || !!photoStatus}
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-4 text-ink-2"
          >
            <span className="text-2xl">📷</span>
            <span className="text-sm">
              レシートを撮る・選ぶ
              {aiEnabled && !expense && (
                <span className="block text-xs text-muted">金額と内訳を自動で読み取ります</span>
              )}
            </span>
          </button>
        )}
        {photoStatus && (
          <p className="mt-3 animate-pulse text-center text-sm text-accent">
            {photoStatus === "uploading" ? "アップロード中…" : "レシートを読み取り中…（10秒ほど）"}
          </p>
        )}
        {ai && ai.groups.length > 1 && (
          <div className="mt-3 rounded-xl bg-accent-soft p-3 text-sm">
            <p className="font-bold">カテゴリが{ai.groups.length}つに分かれています</p>
            <ul className="mt-2 flex flex-col gap-1 tabular">
              {ai.groups.map((g) => (
                <li key={g.category} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {categoryOf(g.category).emoji} {categoryOf(g.category).label}
                    <span className="ml-1 text-xs text-muted">{g.items.slice(0, 3).join("、")}</span>
                  </span>
                  <span>{yen(g.amount)}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={disabled}
              onClick={() => saveGroups(ai)}
              className="mt-3 w-full rounded-lg bg-accent py-2 font-bold text-on-accent disabled:opacity-50"
            >
              カテゴリ別に{ai.groups.length}件で登録
            </button>
            <p className="mt-1 text-center text-xs text-muted">
              まとめて1件にする場合は、下のフォームで登録してください
            </p>
          </div>
        )}
        {ai && ai.groups.length <= 1 && (
          <p className="mt-3 text-center text-xs text-good">読み取りました。内容を確認してください</p>
        )}
      </section>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-bold text-ink-2">金額</span>
        <div className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-2 shadow-sm">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            required
            disabled={disabled}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent text-right text-3xl font-bold tabular outline-none"
          />
          <span className="text-lg">円</span>
        </div>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-bold text-ink-2">内容</span>
        <input
          type="text"
          required
          maxLength={100}
          disabled={disabled}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: スーパーで買い物"
          className="rounded-xl border border-line bg-surface px-3 py-2.5"
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-bold text-ink-2">カテゴリ</span>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={disabled}
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={`flex flex-col items-center rounded-xl border py-2 text-xs ${
                category === c.id
                  ? "border-accent bg-accent-soft font-bold text-accent"
                  : "border-line bg-surface text-ink-2"
              }`}
            >
              <span className="text-xl">{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
        {category === "transfer" && (
          <p className="text-xs text-muted">
            相手に直接お金を渡したときは「払った人＝渡した人」「負担＝全額（受け取った人）」で記録すると精算額から差し引かれます
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-bold text-ink-2">払った人</span>
        <div className="flex gap-2">
          {([1, 2] as const).map((id) => (
            <button
              key={id}
              type="button"
              disabled={disabled}
              aria-pressed={paidBy === id}
              onClick={() => setPaidBy(id)}
              className={memberBtn(id)}
            >
              {names[id - 1]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-bold text-ink-2">負担</span>
        <SplitPicker
          value={split}
          onChange={setSplit}
          names={names}
          amount={amountNum}
          disabled={disabled}
        />
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-bold text-ink-2">日付</span>
        <input
          type="date"
          required
          disabled={disabled}
          value={spentOn}
          onChange={(e) => setSpentOn(e.target.value)}
          className="rounded-xl border border-line bg-surface px-3 py-2.5"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-bold text-ink-2">メモ（任意）</span>
        <textarea
          rows={2}
          maxLength={500}
          disabled={disabled}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="rounded-xl border border-line bg-surface px-3 py-2.5"
        />
      </label>

      {error && (
        <p className="rounded-xl bg-surface p-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {!locked && (
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={disabled || !!photoStatus}
            className="rounded-2xl bg-accent py-4 text-lg font-bold text-on-accent disabled:opacity-50"
          >
            {pending ? "保存中…" : expense ? "保存する" : "追加する"}
          </button>
          {expense && (
            <button type="button" disabled={disabled} onClick={remove} className="py-3 text-danger">
              削除する
            </button>
          )}
        </div>
      )}
    </form>
  );
}
