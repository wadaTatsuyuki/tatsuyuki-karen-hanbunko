import "server-only";
import type { MemberId } from "./types";

export interface Member {
  id: MemberId;
  name: string;
}

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export function getMembers(): [Member, Member] {
  return [
    { id: 1, name: env("MEMBER1_NAME") ?? "わたし" },
    { id: 2, name: env("MEMBER2_NAME") ?? "パートナー" },
  ];
}

export function getMemberPin(id: MemberId): string | undefined {
  return env(id === 1 ? "MEMBER1_PIN" : "MEMBER2_PIN");
}

export function getSessionSecret(): string {
  const s = env("SESSION_SECRET");
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET が設定されていません");
  }
  return "dev-only-session-secret";
}

export function isAiEnabled(): boolean {
  return !!env("ANTHROPIC_API_KEY");
}

export function getAiModel(): string {
  return env("ANTHROPIC_MODEL") ?? "claude-opus-5-5";
}

/** 本番で必須なのに未設定の環境変数（設定ミスを画面で知らせるため） */
export function missingEnv(): string[] {
  const required = ["MEMBER1_PIN", "MEMBER2_PIN"];
  if (process.env.NODE_ENV === "production") {
    required.push("SESSION_SECRET");
    if (!process.env.HANBUNKO_ALLOW_LOCAL_DB) {
      required.push("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
    }
  }
  return required.filter((name) => !env(name));
}
