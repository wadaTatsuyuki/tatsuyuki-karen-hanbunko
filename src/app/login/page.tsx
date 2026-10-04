import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { getMembers, missingEnv } from "@/lib/config";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // 環境変数はビルド時ではなくアクセス時に確認する
  await connection();
  const missing = missingEnv();
  if (missing.length > 0) return <SetupNeeded missing={missing} />;
  if (await getCurrentMember()) redirect("/");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="mb-1 text-center text-3xl font-bold tracking-wide">はんぶんこ</h1>
      <p className="mb-8 text-center text-sm text-muted">ふたりの生活費をまとめて精算</p>
      <LoginForm members={getMembers()} />
    </main>
  );
}

function SetupNeeded({ missing }: { missing: string[] }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-bold">はんぶんこ</h1>
      <p className="mt-4 font-bold">設定がまだ足りません</p>
      <p className="mt-2 text-sm text-ink-2">
        Vercel のプロジェクトの Settings → Environment Variables に、次の項目を追加してください。
      </p>
      <ul className="mt-3 rounded-xl bg-surface p-4 font-mono text-sm shadow-sm">
        {missing.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-ink-2">
        追加したあと、Deployments タブの一番上の「…」から Redeploy すると反映されます。
      </p>
    </main>
  );
}
