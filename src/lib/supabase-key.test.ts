import { describe, expect, it } from "vitest";
import { supabaseKeyProblem } from "./supabase-key";

const jwt = (role: string) =>
  `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.sig`;

describe("supabaseKeyProblem", () => {
  it("公開用のキーを検出する", () => {
    expect(supabaseKeyProblem("sb_publishable_abc")).toMatch(/公開用/);
    expect(supabaseKeyProblem(jwt("anon"))).toMatch(/公開用/);
  });
  it("秘密のキーは問題なし", () => {
    expect(supabaseKeyProblem("sb_secret_abc")).toBeNull();
    expect(supabaseKeyProblem(jwt("service_role"))).toBeNull();
    expect(supabaseKeyProblem(undefined)).toBeNull();
  });
});
