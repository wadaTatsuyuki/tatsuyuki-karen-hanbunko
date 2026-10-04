import Link from "next/link";
import { ExpenseForm } from "@/components/expense-form";
import { requireMember } from "@/lib/auth";
import { getMembers, isAiEnabled } from "@/lib/config";
import { isDate, todayJST } from "@/lib/month";

export default async function NewExpensePage({ searchParams }: PageProps<"/expenses/new">) {
  const me = await requireMember();
  const { date } = await searchParams;
  const today = todayJST();
  const defaultDate = typeof date === "string" && isDate(date) && date <= today ? date : today;
  const members = getMembers();
  return (
    <>
      <header className="mb-4 flex items-center gap-2">
        <Link href="/" className="px-2 py-1 text-xl text-ink-2" aria-label="戻る">
          ‹
        </Link>
        <h1 className="text-lg font-bold">支出を追加</h1>
      </header>
      <ExpenseForm
        names={[members[0].name, members[1].name]}
        me={me}
        aiEnabled={isAiEnabled()}
        defaultDate={defaultDate}
      />
    </>
  );
}
