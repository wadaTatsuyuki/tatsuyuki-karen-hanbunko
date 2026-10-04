import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "./session";

describe("session", () => {
  it("署名したトークンを検証できる", async () => {
    const t = await signSession(2, "secret");
    expect(await verifySession(t, "secret")).toBe(2);
  });
  it("別の秘密鍵や改ざんは拒否する", async () => {
    const t = await signSession(1, "secret");
    expect(await verifySession(t, "other")).toBeNull();
    const [p, s] = t.split(".");
    const forged = btoa(JSON.stringify({ m: 2, exp: Date.now() + 1e9 })).replace(/=+$/, "");
    expect(await verifySession(`${forged}.${s}`, "secret")).toBeNull();
    expect(await verifySession(`${p}.`, "secret")).toBeNull();
    expect(await verifySession(undefined, "secret")).toBeNull();
  });
});
