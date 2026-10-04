import "server-only";
import { createLocalDb } from "./local";
import { createSupabaseDb } from "./supabase";
import type { Db } from "./types";

let db: Db | undefined;

export function getDb(): Db {
  if (db) return db;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    db = createSupabaseDb(url, key);
  } else if (process.env.NODE_ENV === "production" && !process.env.HANBUNKO_ALLOW_LOCAL_DB) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が設定されていません");
  } else {
    db = createLocalDb();
  }
  return db;
}
