import { BottomNav } from "@/components/nav";
import { requireMember } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireMember();
  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      {children}
      <BottomNav />
    </div>
  );
}
