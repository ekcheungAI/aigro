export const DEFAULT_CHUNK_TARGET_CHARS = 2_800;
export const DEFAULT_CHUNK_OVERLAP_CHARS = 400;
export const DEFAULT_MAX_SOURCE_CHARS = 500_000;

export interface TextChunk {
  content: string;
  citationMeta: { start_paragraph: number; end_paragraph: number };
}

export function normalizeSourceText(
  value: string,
  maxChars = DEFAULT_MAX_SOURCE_CHARS,
): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxChars);
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function chunkParagraphText(
  text: string,
  targetChars = DEFAULT_CHUNK_TARGET_CHARS,
  overlapChars = DEFAULT_CHUNK_OVERLAP_CHARS,
): TextChunk[] {
  if (targetChars <= 0 || overlapChars < 0 || overlapChars >= targetChars) {
    throw new Error("invalid_chunk_settings");
  }
  const paragraphs = text.split(/\n{2,}/).map((value) => value.trim()).filter(Boolean);
  const chunks: TextChunk[] = [];
  let current = "";
  let startParagraph = 0;
  paragraphs.forEach((paragraph, index) => {
    if (current && current.length + paragraph.length + 2 > targetChars) {
      chunks.push({
        content: current,
        citationMeta: { start_paragraph: startParagraph, end_paragraph: index - 1 },
      });
      current = current.slice(-overlapChars);
      startParagraph = Math.max(0, index - 1);
    }
    current += `${current ? "\n\n" : ""}${paragraph}`;
  });
  if (current) {
    chunks.push({
      content: current,
      citationMeta: { start_paragraph: startParagraph, end_paragraph: paragraphs.length - 1 },
    });
  }
  return chunks;
}
