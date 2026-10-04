import type { MemberId } from "./types";

// proxy と Server Component の両方から使うので Web Crypto だけで実装する
export const SESSION_COOKIE = "hb_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 180; // 180日

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function key(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(member: MemberId, secret: string): Promise<string> {
  const payload = b64url(
    enc.encode(JSON.stringify({ m: member, exp: Date.now() + SESSION_MAX_AGE * 1000 })),
  );
  const sig = await crypto.subtle.sign("HMAC", await key(secret), enc.encode(payload));
  return `${payload}.${b64url(new Uint8Array(sig))}`;
}

export async function verifySession(
  token: string | undefined,
  secret: string,
): Promise<MemberId | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await key(secret),
      fromB64url(sig) as Uint8Array<ArrayBuffer>,
      enc.encode(payload),
    );
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data.m === 1 || data.m === 2 ? data.m : null;
  } catch {
    return null;
  }
}
