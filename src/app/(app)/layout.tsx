import { redirect } from "next/navigation";
import { BottomNav } from "@/components/nav";
import { requireMember } from "@/lib/auth";
import { envProblem, missingEnv } from "@/lib/config";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // 設定ミスはログイン画面で案内する
  if (missingEnv().length > 0 || envProblem()) redirect("/login");
  await requireMember();
  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      {children}
      <BottomNav />
    </div>
  );
}
