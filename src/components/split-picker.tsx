"use client";

import { member1Share } from "@/lib/settlement";
import type { Split } from "@/lib/types";
import { yen } from "@/lib/month";

export type SplitMode = "equal" | "all1" | "all2" | "ratio" | "amount";

export interface SplitState {
  mode: SplitMode;
  ratio1: number;
  amount1: string;
}

export function splitToState(s: Split): SplitState {
  if (s.splitType === "ratio" && s.splitValue === 100) return { mode: "all1", ratio1: 50, amount1: "" };
  if (s.splitType === "ratio" && s.splitValue === 0) return { mode: "all2", ratio1: 50, amount1: "" };
  if (s.splitType === "ratio") return { mode: "ratio", ratio1: s.splitValue ?? 50, amount1: "" };
  if (s.splitType === "amount") {
    return { mode: "amount", ratio1: 50, amount1: String(s.splitValue ?? "") };
  }
  return { mode: "equal", ratio1: 50, amount1: "" };
}

export function stateToSplit(s: SplitState): Split {
  switch (s.mode) {
    case "all1":
      return { splitType: "ratio", splitValue: 100 };
    case "all2":
      return { splitType: "ratio", splitValue: 0 };
    case "ratio":
      return { splitType: "ratio", splitValue: s.ratio1 };
    case "amount":
      return { splitType: "amount", splitValue: s.amount1 === "" ? null : Number(s.amount1) };
    default:
      return { splitType: "equal", splitValue: null };
  }
}

interface Props {
  value: SplitState;
  onChange: (v: SplitState) => void;
  names: [string, string];
  amount: number;
  disabled?: boolean;
}

export function SplitPicker({ value, onChange, names, amount, disabled }: Props) {
  const options: { mode: SplitMode; label: string }[] = [
    { mode: "equal", label: "半々" },
    { mode: "all1", label: `全額${names[0]}` },
    { mode: "all2", label: `全額${names[1]}` },
    { mode: "ratio", label: "割合で" },
    { mode: "amount", label: "金額で" },
  ];
  const split = stateToSplit(value);
  const valid =
    split.splitType !== "amount" || (split.splitValue !== null && split.splitValue <= amount);
  const s1 = valid ? member1Share(amount, split) : 0;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.mode}
            type="button"
            disabled={disabled}
            aria-pressed={value.mode === o.mode}
            onClick={() => onChange({ ...value, mode: o.mode })}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              value.mode === o.mode
                ? "border-accent bg-accent-soft font-bold text-accent"
                : "border-line bg-surface text-ink-2"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {value.mode === "ratio" && (
        <div className="mt-3">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            disabled={disabled}
            value={value.ratio1}
            onChange={(e) => onChange({ ...value, ratio1: Number(e.target.value) })}
            className="w-full accent-[var(--accent)]"
            aria-label={`${names[0]}の負担割合`}
          />
        </div>
      )}

      {value.mode === "amount" && (
        <label className="mt-3 flex items-center gap-2 text-sm">
          <span className="shrink-0">{names[0]}の負担</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            disabled={disabled}
            value={value.amount1}
            onChange={(e) => onChange({ ...value, amount1: e.target.value })}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-right tabular"
          />
          <span>円</span>
        </label>
      )}

      {amount > 0 && (
        <p className="mt-2 text-xs text-muted tabular">
          {valid ? (
            <>
              {names[0]} {yen(s1)}（{Math.round((s1 / amount) * 1000) / 10}%）／ {names[1]}{" "}
              {yen(amount - s1)}
            </>
          ) : (
            <span className="text-danger">負担額は合計金額以下にしてください</span>
          )}
        </p>
      )}
    </div>
  );
}
