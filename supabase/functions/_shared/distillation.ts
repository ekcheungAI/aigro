export const DEFAULT_CHUNK_TARGET_CHARS = 2_800;
export const DEFAULT_CHUNK_OVERLAP_CHARS = 400;
export const DEFAULT_MAX_SOURCE_CHARS = 500_000;

export interface TextChunk {
  content: string;
  citationMeta: { start_paragraph: number; end_paragraph: number };
}

export interface ValidatedDistillation {
  summary: string;
  claims: Array<{ claim: string; evidence: string; locator?: string }>;
  methods: string[];
  boundaries: string[];
  suggested_questions: string[];
}

function normalizedStringArray(
  value: unknown,
  field: string,
  minimumLength: number,
  maximumItems = 30,
): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > maximumItems) {
    throw new Error(`invalid_distillation_${field}`);
  }
  const normalized = value.map((item) => typeof item === "string" ? item.trim() : "");
  if (normalized.some((item) => item.length < minimumLength)) {
    throw new Error(`invalid_distillation_${field}`);
  }
  return normalized;
}

export function validateDistillationPayload(value: unknown): ValidatedDistillation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_distillation_payload");
  }
  const payload = value as Record<string, unknown>;
  const summary = typeof payload.summary === "string" ? payload.summary.trim() : "";
  if (summary.length < 20) throw new Error("invalid_distillation_summary");

  if (!Array.isArray(payload.claims) || payload.claims.length < 1 || payload.claims.length > 50) {
    throw new Error("invalid_distillation_claims");
  }
  const claims = payload.claims.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("invalid_distillation_claims");
    }
    const claimRecord = item as Record<string, unknown>;
    const claim = typeof claimRecord.claim === "string" ? claimRecord.claim.trim() : "";
    const evidence = typeof claimRecord.evidence === "string" ? claimRecord.evidence.trim() : "";
    const locator = typeof claimRecord.locator === "string"
      ? claimRecord.locator.trim()
      : undefined;
    if (claim.length < 5 || evidence.length < 5) {
      throw new Error("invalid_distillation_claims");
    }
    return { claim, evidence, ...(locator ? { locator } : {}) };
  });

  return {
    summary,
    claims,
    methods: normalizedStringArray(payload.methods, "methods", 2),
    boundaries: normalizedStringArray(payload.boundaries, "boundaries", 2),
    suggested_questions: normalizedStringArray(
      payload.suggested_questions,
      "suggested_questions",
      5,
    ),
  };
}

export function mergeCitationProvenance(
  locator: Record<string, unknown>,
  sourceMeta: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return { ...(sourceMeta ?? {}), ...locator };
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
