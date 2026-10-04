const WRONG_KEY =
  "SUPABASE_SERVICE_ROLE_KEY に公開用のキー（anon / publishable）が入っています。Supabase の Project Settings → API Keys にある秘密のキー（sb_secret_… または service_role）に差し替えてください。";

/** 公開用のキーが設定されていたら、その旨のメッセージを返す */
export function supabaseKeyProblem(key: string | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("sb_publishable_")) return WRONG_KEY;
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(
        Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
      );
      if (payload.role && payload.role !== "service_role") return WRONG_KEY;
    } catch {
      // JWT として読めなければ判定しない
    }
  }
  return null;
}
