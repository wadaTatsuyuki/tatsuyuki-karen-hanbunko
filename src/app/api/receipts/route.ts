import { randomUUID } from "node:crypto";
import { assertMember } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { currentMonthJST } from "@/lib/month";

const MAX_BYTES = 4 * 1024 * 1024;

// 画像はブラウザ側で JPEG に縮小してから送られてくる
export async function POST(request: Request) {
  try {
    await assertMember();
  } catch {
    return Response.json({ error: "ログインしてください" }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return Response.json({ error: "画像がありません" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "画像が大きすぎます" }, { status: 413 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return Response.json({ error: "JPEG画像ではありません" }, { status: 400 });
  }
  const path = `${currentMonthJST()}/${randomUUID()}.jpg`;
  await getDb().putReceipt(path, bytes, "image/jpeg");
  return Response.json({ path });
}
