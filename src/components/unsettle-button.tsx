"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { unsettle } from "@/app/actions";

export function UnsettleButton({ month, label }: { month: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`${label}の精算を取り消しますか？\nその月の支出を再び編集できるようになります。`)) return;
        start(async () => {
          const r = await unsettle(month);
          if (!r.ok) alert(r.error);
          router.refresh();
        });
      }}
      className="text-xs text-muted underline"
    >
      取り消す
    </button>
  );
}
