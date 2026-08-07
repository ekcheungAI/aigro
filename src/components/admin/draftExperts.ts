/** Expert slug helpers shared by the Supabase-backed Admin editor. */

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
