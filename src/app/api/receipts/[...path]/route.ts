import { assertMember } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(_req: Request, ctx: RouteContext<"/api/receipts/[...path]">) {
  try {
    await assertMember();
  } catch {
    return new Response("unauthorized", { status: 401 });
  }
  const path = (await ctx.params).path.join("/");
  if (!/^\d{4}-\d{2}\/[0-9a-f-]{36}\.jpg$/.test(path)) {
    return new Response("not found", { status: 404 });
  }
  const file = await getDb().getReceipt(path);
  if (!file) return new Response("not found", { status: 404 });
  return new Response(file.bytes as Uint8Array<ArrayBuffer>, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
