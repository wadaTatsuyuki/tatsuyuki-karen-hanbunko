import { z } from "zod";
import { CATEGORY_IDS } from "./categories";
import { isDate } from "./month";

const member = z.union([z.literal(1), z.literal(2)]);

const split = {
  splitType: z.enum(["equal", "ratio", "amount"]),
  splitValue: z.number().finite().min(0).nullable(),
};

function checkSplit(
  v: { splitType: string; splitValue: number | null; amount: number },
  ctx: z.RefinementCtx,
) {
  if (v.splitType === "ratio" && (v.splitValue === null || v.splitValue > 100)) {
    ctx.addIssue({ code: "custom", message: "負担割合は0〜100%で入力してください" });
  }
  if (v.splitType === "amount" && (v.splitValue === null || v.splitValue > v.amount)) {
    ctx.addIssue({ code: "custom", message: "負担額は合計金額以下で入力してください" });
  }
}

const amount = z
  .number({ message: "金額を入力してください" })
  .int("金額は整数で入力してください")
  .min(1, "金額は1円以上で入力してください")
  .max(100_000_000, "金額が大きすぎます");

const title = z.string().trim().min(1, "内容を入力してください").max(100);

export const expenseSchema = z
  .object({
    spentOn: z.string().refine(isDate, "日付が正しくありません"),
    title,
    amount,
    category: z.enum(CATEGORY_IDS),
    paidBy: member,
    ...split,
    memo: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .transform((v) => v || null),
    receiptPath: z
      .string()
      .regex(/^\d{4}-\d{2}\/[0-9a-f-]{36}\.jpg$/, "画像が正しくありません")
      .nullable(),
  })
  .superRefine(checkSplit);

export const recurringSchema = z
  .object({
    title,
    amount,
    category: z.enum(CATEGORY_IDS),
    paidBy: member,
    ...split,
    dayOfMonth: z.number().int().min(1).max(31),
    active: z.boolean(),
  })
  .superRefine(checkSplit);

export function firstError(e: z.ZodError): string {
  return e.issues[0]?.message ?? "入力内容を確認してください";
}
