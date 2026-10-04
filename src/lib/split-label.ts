import { member1Share } from "./settlement";
import type { Split } from "./types";
import { yen } from "./month";

/** 半々以外のときだけ表示する負担の説明。半々なら null */
export function splitLabel(
  amount: number,
  split: Split,
  names: [string, string],
): string | null {
  if (split.splitType === "equal") return null;
  const s1 = member1Share(amount, split);
  if (s1 === amount / 2) return null;
  if (s1 >= amount) return `全額${names[0]}`;
  if (s1 <= 0) return `全額${names[1]}`;
  if (split.splitType === "ratio") {
    const p = split.splitValue ?? 50;
    return `${names[0]}${p}% / ${names[1]}${Math.round((100 - p) * 100) / 100}%`;
  }
  return `${names[0]}${yen(s1)} / ${names[1]}${yen(amount - s1)}`;
}
