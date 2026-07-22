/**
 * Typewriter tokenizer + timing (design.md §5.3 / ask.md §3 — 強制規格):
 * - 基速 24 字/秒（逐 CJK 字 / 逐 Latin 詞）
 * - 標點（。，！？：；、）後停 120ms
 * - 段落後停 260ms
 * - ±20ms 隨機抖動
 * `**bold**` markers are parsed into bold units (not rendered literally).
 */

export interface TypeUnit {
  text: string;
  bold: boolean;
  paragraph: number;
}

/** Latin word (with trailing spaces) | whitespace run | any single char (CJK, punct) */
const UNIT_PATTERN = /[A-Za-z0-9]+(?:[.'’/%+-][A-Za-z0-9]+)*\s*|\s+|./gsu;

export function tokenizeTypewriter(input: string): TypeUnit[] {
  const paragraphs = input
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const units: TypeUnit[] = [];
  paragraphs.forEach((para, pIndex) => {
    // Split on `**` — odd segments are bold
    const segments = para.split("**");
    segments.forEach((seg, sIndex) => {
      const bold = sIndex % 2 === 1;
      const matches = seg.match(UNIT_PATTERN);
      if (!matches) return;
      for (const m of matches) {
        if (/^\s+$/.test(m)) {
          // Attach stray whitespace to the previous unit so spacing renders
          const prev = units[units.length - 1];
          if (prev && prev.paragraph === pIndex) prev.text += m;
          continue;
        }
        units.push({ text: m, bold, paragraph: pIndex });
      }
    });
  });
  return units;
}

const BASE_MS = 1000 / 24; // 24 chars/s
const PUNCT_PAUSE_MS = 120;
const PARAGRAPH_PAUSE_MS = 260;
const PUNCTUATION = new Set([..."。，！？：；、"]);

/** Delay before revealing the NEXT unit, given the unit just revealed. */
export function delayAfterUnit(unit: TypeUnit, next: TypeUnit | undefined): number {
  let ms = BASE_MS;
  const lastChar = unit.text.trimEnd().slice(-1);
  if (PUNCTUATION.has(lastChar)) ms += PUNCT_PAUSE_MS;
  if (next && next.paragraph !== unit.paragraph) ms += PARAGRAPH_PAUSE_MS;
  const jitter = (Math.random() * 2 - 1) * 20; // ±20ms
  return Math.max(8, ms + jitter);
}
