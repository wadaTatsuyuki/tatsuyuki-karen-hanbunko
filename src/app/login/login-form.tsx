"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { login } from "@/app/actions";
import type { Member } from "@/lib/config";
import type { MemberId } from "@/lib/types";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
const LAST_MEMBER_KEY = "hanbunko:last-member";

export function LoginForm({ members }: { members: Member[] }) {
  const [state, action, pending] = useActionState(login, null);
  const [member, setMember] = useState<MemberId | null>(null);
  const [pin, setPin] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    try {
      const last = Number(localStorage.getItem(LAST_MEMBER_KEY));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage はマウント後にしか読めない
      if (last === 1 || last === 2) setMember(last);
    } catch {}
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 失敗したら入力をクリア
    if (state && !state.ok) setPin("");
  }, [state]);

  function choose(id: MemberId) {
    setMember(id);
    setPin("");
    try {
      localStorage.setItem(LAST_MEMBER_KEY, String(id));
    } catch {}
  }

  function press(k: string) {
    if (pending) return;
    if (k === "del") setPin((p) => p.slice(0, -1));
    else if (k && pin.length < 12) setPin((p) => p + k);
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col items-center gap-6">
      <input type="hidden" name="member" value={member ?? ""} />
      <input type="hidden" name="pin" value={pin} />

      <div className="grid w-full grid-cols-2 gap-3" role="radiogroup" aria-label="だれが使う？">
        {members.map((m) => {
          const active = member === m.id;
          const tone =
            m.id === 1 ? "border-m1 bg-m1-soft text-ink" : "border-m2 bg-m2-soft text-ink";
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(m.id)}
              className={`rounded-2xl border-2 px-4 py-4 text-lg font-bold transition ${
                active ? tone : "border-line bg-surface text-ink-2"
              }`}
            >
              {m.name}
            </button>
          );
        })}
      </div>

      {member && (
        <>
          <div className="flex h-6 items-center gap-3" aria-label={`${pin.length}桁入力済み`}>
            {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
              <span
                key={i}
                className={`h-3.5 w-3.5 rounded-full ${i < pin.length ? "bg-ink" : "bg-line"}`}
              />
            ))}
          </div>

          <p className="h-5 text-sm text-danger" role="alert">
            {state && !state.ok ? state.error : ""}
          </p>

          <div className="grid w-full max-w-[280px] grid-cols-3 gap-3">
            {KEYS.map((k, i) =>
              k === "" ? (
                <span key={i} />
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => press(k)}
                  aria-label={k === "del" ? "1文字消す" : k}
                  className="h-16 rounded-2xl bg-surface text-2xl font-semibold shadow-sm active:bg-surface-2"
                >
                  {k === "del" ? "⌫" : k}
                </button>
              ),
            )}
          </div>

          <button
            type="submit"
            disabled={pin.length < 4 || pending}
            className="w-full max-w-[280px] rounded-2xl bg-accent py-4 text-lg font-bold text-on-accent disabled:opacity-40"
          >
            {pending ? "確認中…" : "ひらく"}
          </button>
        </>
      )}
    </form>
  );
}
