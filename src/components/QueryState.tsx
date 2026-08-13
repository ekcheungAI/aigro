import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * QueryState(F7)— 接 Supabase 前嘅 async 狀態腳手架。
 *
 * 而家全站數據係 sync import(零 async);接 DB 之後每個 query 位置
 * 用呢個 component 包實際內容,統一 loading / error / empty 三態:
 *
 * ```tsx
 * <QueryState
 *   loading={query.isPending}
 *   error={query.error ? "載入失敗,請重試。" : null}
 *   empty={items.length === 0 ? <EmptyState /> : null}
 *   retry={query.refetch}
 * >
 *   {items.map(...)}
 * </QueryState>
 * ```
 *
 * 優先次序:loading → error → empty → children。
 * 用法文件:docs/QueryState.md
 */

/** loading 態 — token-based pulse rows(bg-accent animate-pulse,無 shimmer gradient) */
function SkeletonRows({ rows }: { rows: number }) {
  return (
    <div className="grid gap-3 p-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">正在載入資料…</span>
      <div className="contents" aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export interface QueryStateProps {
  /** true → skeleton rows */
  loading?: boolean;
  /** 非 null → inline error card(+ retry 掣,如有提供) */
  error?: string | null;
  /** 非 null → 視為 empty 狀態,render 呢個 node(數據非空時傳 null) */
  empty?: ReactNode;
  /** error 態嘅重試 handler */
  retry?: () => void;
  /** skeleton 行數,預設 3 */
  skeletonRows?: number;
  children?: ReactNode;
}

export default function QueryState({
  loading = false,
  error = null,
  empty = null,
  retry,
  skeletonRows = 3,
  children,
}: QueryStateProps) {
  if (loading) return <SkeletonRows rows={skeletonRows} />;

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-md border bg-surface p-8 text-center"
      >
        <p className="text-body-sm text-text-secondary">{error}</p>
        {retry && (
          <button
            type="button"
            onClick={retry}
            className="press mt-4 inline-flex h-10 items-center rounded-md border border-border-strong px-5 text-label text-ink hover:border-ink"
          >
            重試
          </button>
        )}
      </div>
    );
  }

  if (empty != null) return <>{empty}</>;

  return <>{children}</>;
}
