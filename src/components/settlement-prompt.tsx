"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markSettled } from "@/app/actions";

interface Props {
  month: string;
  monthLabel: string;
  pair: string;
  amount: string | null;
  detail: string;
}

/** 月初に前月の精算をうながすポップアップ */
export function SettlementPrompt({ month, monthLabel, pair, amount, detail }: Props) {
  const key = `hanbunko:later:${month}`;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let later = false;
    try {
      later = sessionStorage.getItem(key) === "1";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage はマウント後にしか読めない
    if (!later) setOpen(true);
  }, [key]);

  if (!open) return null;

  function later() {
    try {
      sessionStorage.setItem(key, "1");
    } catch {}
    setOpen(false);
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settle-title"
    >
      <div className="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-xl">
        <p className="text-sm text-muted">月がかわりました 🎉</p>
        <h2 id="settle-title" className="mt-1 text-lg font-bold">
          {monthLabel}の精算
        </h2>
        <p className="mt-4 text-lg font-bold">{pair}</p>
        {amount && <p className="text-4xl font-bold tabular">{amount}</p>}
        <p className="mt-1 text-sm text-ink-2">{detail}</p>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await markSettled(month);
                if (!r.ok) return setError(r.error);
                setOpen(false);
                router.refresh();
              })
            }
            className="rounded-xl bg-accent py-3 font-bold text-on-accent disabled:opacity-50"
          >
            {pending ? "記録中…" : "精算した！（精算済みにする）"}
          </button>
          <a
            href={`/?month=${month}`}
            onClick={later}
            className="rounded-xl py-3 text-center text-ink-2"
          >
            内訳を確認する
          </a>
          <button type="button" onClick={later} className="py-2 text-sm text-muted">
            あとで
          </button>
        </div>
      </div>
    </div>
  );
}
