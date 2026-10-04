import Link from "next/link";
import { logout } from "@/app/actions";
import { RecurringManager } from "@/components/recurring-manager";
import { UnsettleButton } from "@/components/unsettle-button";
import { requireMember } from "@/lib/auth";
import { getMembers, isAiEnabled } from "@/lib/config";
import { getDb } from "@/lib/db";
import { formatMonth, yen } from "@/lib/month";

export default async function SettingsPage() {
  const me = await requireMember();
  const db = getDb();
  const [recurring, settlements] = await Promise.all([db.listRecurring(), db.listSettlements()]);
  const members = getMembers();
  const names: [string, string] = [members[0].name, members[1].name];

  return (
    <>
      <h1 className="mb-4 text-lg font-bold">設定</h1>

      <section>
        <h2 className="mb-2 text-sm font-bold text-ink-2">固定費（毎月自動で記録）</h2>
        <RecurringManager items={recurring} names={names} me={me} />
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-bold text-ink-2">精算履歴</h2>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-sm">
          {settlements.length === 0 && (
            <li className="p-4 text-sm text-muted">まだ精算の記録はありません</li>
          )}
          {settlements.map((s) => (
            <li key={s.month} className="flex items-center gap-3 px-4 py-3">
              <Link href={`/?month=${s.month}`} className="min-w-0 flex-1">
                <span className="block font-medium">{formatMonth(s.month)}</span>
                <span className="block text-xs text-muted tabular">
                  {s.fromMember && s.toMember
                    ? `${names[s.fromMember - 1]} → ${names[s.toMember - 1]} ${yen(s.amount)}`
                    : "精算なし"}
                  ・{new Date(s.settledAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}
                  に記録
                </span>
              </Link>
              <UnsettleButton month={s.month} label={formatMonth(s.month)} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-2xl bg-surface p-4 text-sm shadow-sm">
        <p>
          ログイン中: <span className="font-bold">{names[me - 1]}</span>
        </p>
        <p className="mt-1 text-xs text-muted">
          レシートの自動読み取り: {isAiEnabled() ? "オン" : "オフ（ANTHROPIC_API_KEY 未設定）"}
        </p>
        <p className="mt-1 text-xs text-muted">
          精算額は10円単位で、立て替えた側（受け取る側）が得をするよう切り上げています。
        </p>
        <form action={logout} className="mt-3">
          <button type="submit" className="w-full rounded-xl border border-line py-2.5 text-ink-2">
            ログアウト
          </button>
        </form>
      </section>
    </>
  );
}
