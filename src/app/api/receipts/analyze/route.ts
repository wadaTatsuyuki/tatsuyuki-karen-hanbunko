import Anthropic from "@anthropic-ai/sdk";
import { assertMember } from "@/lib/auth";
import { isAiEnabled } from "@/lib/config";
import { getDb } from "@/lib/db";
import { readReceipt, ReceiptReadError } from "@/lib/receipt-ai";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    await assertMember();
  } catch {
    return Response.json({ error: "ログインしてください" }, { status: 401 });
  }
  if (!isAiEnabled()) {
    return Response.json({ error: "自動読み取りは設定されていません" }, { status: 400 });
  }
  const { path } = (await request.json()) as { path?: string };
  if (!path || !/^\d{4}-\d{2}\/[0-9a-f-]{36}\.jpg$/.test(path)) {
    return Response.json({ error: "画像が正しくありません" }, { status: 400 });
  }
  const file = await getDb().getReceipt(path);
  if (!file) return Response.json({ error: "画像が見つかりません" }, { status: 404 });

  try {
    return Response.json(await readReceipt(file.bytes));
  } catch (e) {
    if (e instanceof ReceiptReadError) {
      return Response.json({ error: e.message }, { status: 422 });
    }
    if (e instanceof Anthropic.RateLimitError) {
      return Response.json(
        { error: "混み合っています。少し待ってからもう一度お試しください" },
        { status: 429 },
      );
    }
    if (e instanceof Anthropic.AuthenticationError) {
      console.error(e);
      return Response.json({ error: "APIキーが正しくありません" }, { status: 500 });
    }
    console.error(e);
    return Response.json({ error: "読み取りに失敗しました" }, { status: 502 });
  }
}
