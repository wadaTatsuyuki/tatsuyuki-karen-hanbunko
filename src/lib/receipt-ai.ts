import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from "./categories";
import { getAiModel } from "./config";

const ReceiptSchema = z.object({
  is_receipt: z.boolean().describe("画像がレシート・領収書・明細として読めるか"),
  store_name: z.string().describe("店名。不明なら空文字"),
  date: z.string().describe("購入日 YYYY-MM-DD。読めなければ空文字"),
  total: z.number().int().describe("支払総額（税込・値引き後、円）"),
  title: z.string().describe("家計簿に書く短い内容。例: 「スーパー〇〇 食材」"),
  groups: z
    .array(
      z.object({
        category: z.enum(CATEGORY_IDS),
        amount: z.number().int().describe("このカテゴリの金額（税・値引きを按分済み、円）"),
        items: z.array(z.string()).describe("このカテゴリに入れた品名"),
      }),
    )
    .describe("カテゴリ別の内訳。amount の合計は total と一致させる"),
});

export interface ReceiptResult {
  storeName: string;
  date: string | null;
  total: number;
  title: string;
  groups: { category: CategoryId; amount: number; items: string[] }[];
}

const SYSTEM = `あなたは同棲カップルの家計簿アプリ「はんぶんこ」のレシート読み取り係です。
レシート画像から支払総額とカテゴリ別の内訳を読み取ってください。

カテゴリ:
${CATEGORIES.map((c) => `- ${c.id}: ${c.label}`).join("\n")}

ルール:
- total は実際に支払った総額（税込、値引き・ポイント利用後）。
- 品目をカテゴリに振り分け、消費税・値引き・端数は各カテゴリの金額に比例して按分し、groups の amount の合計が total とちょうど一致するようにする。
- 飲食店での食事は eating_out、スーパー等で買った食材・飲料は food、洗剤やティッシュ等の消耗品は daily。
- 迷ったら other。カテゴリが1つしかなければ groups は1件。
- title は店名＋内容がわかる20文字程度の日本語。
- 画像がレシートとして読めない場合は is_receipt を false にし、total は 0、groups は空にする。`;

/** 合計のずれ（読み取り誤差）を一番大きいカテゴリで吸収する */
export function reconcileGroups(
  total: number,
  groups: ReceiptResult["groups"],
): ReceiptResult["groups"] {
  const merged = new Map<CategoryId, { amount: number; items: string[] }>();
  for (const g of groups) {
    if (g.amount <= 0) continue;
    const cur = merged.get(g.category) ?? { amount: 0, items: [] };
    cur.amount += g.amount;
    cur.items.push(...g.items);
    merged.set(g.category, cur);
  }
  const list = [...merged].map(([category, v]) => ({ category, ...v }));
  if (list.length === 0) return total > 0 ? [{ category: "other", amount: total, items: [] }] : [];
  list.sort((a, b) => b.amount - a.amount);
  const diff = total - list.reduce((s, g) => s + g.amount, 0);
  list[0].amount += diff;
  return list.filter((g) => g.amount > 0);
}

export class ReceiptReadError extends Error {}

export async function readReceipt(jpeg: Uint8Array): Promise<ReceiptResult> {
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: getAiModel(),
    max_tokens: 16000,
    output_config: { effort: "low", format: betaZodOutputFormat(ReceiptSchema) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: Buffer.from(jpeg).toString("base64"),
            },
          },
          { type: "text", text: "このレシートを読み取ってください。" },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new ReceiptReadError("この画像は読み取れませんでした");
  }
  const r = response.parsed_output;
  if (!r || !r.is_receipt || r.total <= 0) {
    throw new ReceiptReadError("レシートを読み取れませんでした。明るい場所で撮り直してみてください");
  }
  return {
    storeName: r.store_name,
    date: /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : null,
    total: r.total,
    title: r.title || r.store_name || "レシート",
    groups: reconcileGroups(r.total, r.groups),
  };
}
