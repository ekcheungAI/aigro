/**
 * 日報動態日期工具 — 以今日日期取代 hardcode mock date。
 * 期號規則：創刊日 2026-06-10 = 第 001 期，逐日遞增。
 */

const WEEKDAYS_TC = [
  "星期日",
  "星期一",
  "星期二",
  "星期三",
  "星期四",
  "星期五",
  "星期六",
] as const;

const LAUNCH_DATE = new Date(2026, 5, 10); // 2026-06-10 = 第 001 期

export interface DailyInfo {
  /** e.g. "2026-07-22" */
  date: string;
  /** e.g. "星期三" */
  weekday: string;
  /** e.g. "043" */
  number: string;
}

function toDailyInfo(d: Date): DailyInfo {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const diffDays = Math.max(
    0,
    Math.floor(
      (new Date(y, d.getMonth(), d.getDate()).getTime() - LAUNCH_DATE.getTime()) /
        86_400_000
    )
  );
  return {
    date: `${y}-${m}-${day}`,
    weekday: WEEKDAYS_TC[d.getDay()],
    number: String(diffDays + 1).padStart(3, "0"),
  };
}

/** 今日嘅日報資訊 */
export function todayInfo(): DailyInfo {
  return toDailyInfo(new Date());
}

/** 近 N 日嘅日報列表（今日排最前） */
export function recentIssues(count: number): (DailyInfo & { current: boolean })[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    return { ...toDailyInfo(d), current: i === 0 };
  });
}
