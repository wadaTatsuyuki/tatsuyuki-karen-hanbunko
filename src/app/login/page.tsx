import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getMembers } from "@/lib/config";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentMember()) redirect("/");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="mb-1 text-center text-3xl font-bold tracking-wide">はんぶんこ</h1>
      <p className="mb-8 text-center text-sm text-muted">ふたりの生活費をまとめて精算</p>
      <LoginForm members={getMembers()} />
    </main>
  );
}
