"use client";

import { useState } from "react";
import { yen } from "@/lib/month";

interface Point {
  month: string;
  label: string;
  total: number;
}

/** 月ごとの合計（単一系列の縦棒）。タップ／ホバーで金額を表示 */
export function TrendChart({ points, selected }: { points: Point[]; selected: string }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...points.map((p) => p.total));
  const focus = points.find((p) => p.month === (active ?? selected));

  return (
    <div>
      <p className="h-6 text-sm text-ink-2 tabular" aria-live="polite">
        {focus ? (
          <>
            {focus.label}: <span className="font-bold text-ink">{yen(focus.total)}</span>
          </>
        ) : null}
      </p>
      <div className="relative mt-1 h-36">
        <div className="absolute inset-x-0 bottom-0 border-t border-line" />
        <div className="absolute inset-0 flex items-end justify-around gap-2">
          {points.map((p) => (
            <button
              key={p.month}
              type="button"
              className="flex h-full flex-1 items-end justify-center"
              onMouseEnter={() => setActive(p.month)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(p.month)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(p.month)}
              aria-label={`${p.label} ${yen(p.total)}`}
            >
              <span
                className="block w-full max-w-6 rounded-t bg-chart transition-opacity"
                style={{
                  height: `${(p.total / max) * 100}%`,
                  minHeight: p.total > 0 ? 2 : 0,
                  opacity: p.month === (active ?? selected) ? 1 : 0.45,
                }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-around gap-2 text-xs text-muted">
        {points.map((p) => (
          <span key={p.month} className="flex-1 text-center">
            {p.label.replace(/^\d+年/, "")}
          </span>
        ))}
      </div>
    </div>
  );
}
