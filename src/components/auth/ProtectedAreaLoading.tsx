/** Stable auth-checking shell used by protected areas to avoid a false signed-out flash. */
export default function ProtectedAreaLoading() {
  return (
    <main
      className="flex min-h-[100dvh] items-center justify-center bg-bg px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-sm text-center">
        <img
          src="/brand/aigro-wordmark-navy-transparent.png"
          alt="AIGRO"
          width={1267}
          height={636}
          className="mx-auto h-9 w-auto dark:hidden"
        />
        <img
          src="/brand/aigro-wordmark-white-transparent.png"
          alt=""
          width={1267}
          height={636}
          className="mx-auto hidden h-9 w-auto dark:block"
        />
        <div className="mx-auto mt-6 h-px w-28 overflow-hidden bg-border" aria-hidden="true">
          <span className="block h-full w-1/2 animate-pulse bg-lime" />
        </div>
        <p className="mt-4 font-mono text-xs text-text-muted">正在驗證管理員權限…</p>
      </div>
    </main>
  );
}
