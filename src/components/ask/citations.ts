import type { Citation } from "./AiMessage";

/** Human-readable citation title plus the most precise available locator. */
export function citationLabel(citation: Citation): string {
  const prefix = citation.marker ? `[${citation.marker}] ` : "";
  if (citation.page) return `${prefix}${citation.title} · p.${citation.page}`;
  if (citation.start_seconds !== undefined) {
    const minutes = Math.floor(citation.start_seconds / 60);
    const seconds = Math.floor(citation.start_seconds % 60).toString().padStart(2, "0");
    return `${prefix}${citation.title} · ${minutes}:${seconds}`;
  }
  if (citation.section) return `${prefix}${citation.title} · ${citation.section}`;
  return `${prefix}${citation.title}`;
}

/** Explain why a sanitized citation is intentionally not clickable. */
export function citationSourceLabel(citation: Citation): string {
  return citation.revision_id ? "私人來源" : "來源連結不可用";
}
