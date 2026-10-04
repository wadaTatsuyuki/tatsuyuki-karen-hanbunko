"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <p className="text-lg font-bold">エラーが発生しました</p>
      <p className="mt-2 text-sm text-ink-2">
        しばらくしてからもう一度お試しください。続く場合は、Vercel の Logs
        に原因が表示されています。
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-xl bg-accent py-3 font-bold text-on-accent"
      >
        再読み込み
      </button>
    </main>
  );
}
