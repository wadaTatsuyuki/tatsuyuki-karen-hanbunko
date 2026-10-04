import Link from "next/link";
import { notFound } from "next/navigation";
import { ExpenseForm } from "@/components/expense-form";
import { requireMember } from "@/lib/auth";
import { getMembers, isAiEnabled } from "@/lib/config";
import { getDb } from "@/lib/db";
import { currentMonthJST } from "@/lib/month";

export default async function EditExpensePage({ params }: PageProps<"/expenses/[id]">) {
  const me = await requireMember();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = getDb();
  const expense = await db.getExpense(id);
  if (!expense) notFound();
  const settlement = await db.getSettlement(expense.spentOn.slice(0, 7));
  const members = getMembers();
  const month = expense.spentOn.slice(0, 7);
  return (
    <>
      <header className="mb-4 flex items-center gap-2">
        <Link
          href={month === currentMonthJST() ? "/" : `/?month=${month}`}
          className="px-2 py-1 text-xl text-ink-2"
          aria-label="戻る"
        >
          ‹
        </Link>
        <h1 className="text-lg font-bold">支出を編集</h1>
      </header>
      <ExpenseForm
        names={[members[0].name, members[1].name]}
        me={me}
        aiEnabled={isAiEnabled()}
        defaultDate={expense.spentOn}
        expense={expense}
        locked={!!settlement}
      />
    </>
  );
}
