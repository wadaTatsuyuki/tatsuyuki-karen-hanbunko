"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markSettled } from "@/app/actions";

export function SettleButton({ month, label }: { month: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`${label}\nこの内容で精算済みにしますか？`)) return;
          start(async () => {
            const r = await markSettled(month);
            if (!r.ok) setError(r.error);
            else router.refresh();
          });
        }}
        className="w-full rounded-xl bg-accent py-3 font-bold text-on-accent disabled:opacity-50"
      >
        {pending ? "記録中…" : "精算済みにする"}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
