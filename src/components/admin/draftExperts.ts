/**
 * draftExperts — 新增導師草稿(localStorage 持久化)。
 *
 * 呢啲係「草稿 — 未發佈」:未接 Supabase experts 後端之前,
 * 建立嘅導師檔只存本機,UI 一律標明草稿狀態。
 * (由 src/data/admin-mock.ts 遷出 — mock 數據檔已刪除。)
 */

export interface DraftExpertInput {
  /** 由姓名自動生成(可手動改),需全站唯一 */
  slug: string;
  /** 顯示姓名 */
  name: string;
  /** 頭銜 credential,如「XX 創辦人」 */
  credential: string;
  /** 領域 specialty chips */
  specialties: string[];
  /** 專家專屬色(去飽和 preset) */
  brandColor: string;
  /** 一句話定位 */
  quote: string;
  /** 建立日期 ISO(YYYY-MM-DD) */
  createdAt: string;
}

export const DRAFT_EXPERTS_STORAGE_KEY = "aigro-admin-drafts";

/** 讀取已建立草稿(localStorage 不可用時回空陣列,唔會 throw) */
export function loadDraftExperts(): DraftExpertInput[] {
  try {
    const raw = window.localStorage.getItem(DRAFT_EXPERTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DraftExpertInput[]) : [];
  } catch {
    return [];
  }
}

/** 寫回草稿清單(private mode 等寫入失敗時靜默) */
export function persistDraftExperts(drafts: DraftExpertInput[]): void {
  try {
    window.localStorage.setItem(
      DRAFT_EXPERTS_STORAGE_KEY,
      JSON.stringify(drafts)
    );
  } catch {
    /* 靜默 — 原型環境容許 persistence 失敗 */
  }
}

/** 由姓名生成 slug:NFKD 去重音 → 小寫 → 非 a-z0-9 轉連字符;中文名等無 ASCII 結果時回 fallback */
export function slugifyExpertName(name: string): string {
  const ascii = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii || "new-expert";
}

/** 確保 slug 唯一 — 同現有專家/草稿撞名時追加 -2、-3… */
export function uniqueExpertSlug(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  let i = 2;
  while (taken.includes(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}
