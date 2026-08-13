import { LoaderCircle } from "lucide-react";

interface ProtectedAreaLoadingProps {
  label?: string;
}

/** Neutral full-page state while protected routes resolve auth or workspace data. */
export default function ProtectedAreaLoading({
  label = "正在確認登入狀態…",
}: ProtectedAreaLoadingProps) {
  return (
    <main
      className="flex min-h-[100dvh] items-center justify-center bg-bg px-4 py-16 text-text-primary"
      aria-busy="true"
    >
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-4 text-center"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-lime-soft">
          <LoaderCircle
            className="h-5 w-5 animate-spin text-lime-text motion-reduce:animate-none"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </span>
        <p className="font-mono text-xs text-text-muted">{label}</p>
      </div>
    </main>
  );
}
