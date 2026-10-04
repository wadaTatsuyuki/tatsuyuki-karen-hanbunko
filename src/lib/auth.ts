import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionSecret } from "./config";
import { SESSION_COOKIE, verifySession } from "./session";
import type { MemberId } from "./types";

export async function getCurrentMember(): Promise<MemberId | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value, getSessionSecret());
}

/** ページ用: 未ログインならログイン画面へ */
export async function requireMember(): Promise<MemberId> {
  const m = await getCurrentMember();
  if (!m) redirect("/login");
  return m;
}

export class UnauthorizedError extends Error {}

/** API・Server Action 用: 未ログインなら例外 */
export async function assertMember(): Promise<MemberId> {
  const m = await getCurrentMember();
  if (!m) throw new UnauthorizedError("ログインしてください");
  return m;
}
