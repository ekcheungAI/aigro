import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Portal 表單欄位統一樣式(沿用 AdminStudio FIELD) */
export const PORTAL_FIELD =
  "w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-lime focus:outline-none";

/** 產品規則:每週情報配額(政策常數,唔係數據)— PortalHome / PortalInsights 共用 */
export const WEEKLY_INSIGHT_QUOTA = 3;

/** Section header — overline(01 · X)+ Fraunces 標題 + 說明,沿用 AdminStudio 模式 */
export function PortalSectionHeader({
  overline,
  title,
  desc,
  actions,
}: {
  overline: string;
  title: string;
  desc?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime-text">
          {overline}
        </p>
        <h2 className="mt-1 font-display text-[20px] font-medium text-text-primary">
          {title}
        </h2>
        {desc && <p className="mt-0.5 text-xs text-text-muted">{desc}</p>}
      </div>
      {actions}
    </div>
  );
}

/**
 * Hairline bars — 極幼柱狀圖(Plex Mono 數據文化)。
 * 最後一條(最近)用 lime,其餘 border-strong;寬度 2px hairline。
 */
export function HairlineBars({
  values,
  labels,
  height = 48,
  className,
}: {
  values: number[];
  labels?: string[];
  /** 柱區高度 px */
  height?: number;
  className?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className={cn("flex items-end gap-1.5", className)}>
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="flex w-full items-end justify-center"
            style={{ height }}
          >
            <span
              className={cn(
                "w-[3px] rounded-full",
                i === values.length - 1 ? "bg-lime" : "bg-border-strong"
              )}
              style={{ height: Math.max(3, Math.round((v / max) * height)) }}
            />
          </div>
          {labels && (
            <span className="font-mono text-[9px] text-text-muted">
              {labels[i]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
