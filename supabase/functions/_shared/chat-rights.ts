export type RightsSafeReplayState =
  | "ready"
  | "missing"
  | "payload_mismatch"
  | "sources_unavailable"
  | "unavailable";

export interface RightsSafeReplayResult {
  state: RightsSafeReplayState;
  answer: Record<string, unknown> | null;
}

export interface CurrentRetrievalReference {
  chunk_id: string;
  revision_id: string;
  similarity: number;
}

export interface RightsSafeHistoryTurn {
  role: "user" | "assistant";
  content: string;
  turn_sequence?: number;
  revision_ids?: unknown;
}

export interface AuthorizedChatCommit {
  messageId: string;
  answer: string;
  citations: Array<Record<string, unknown>>;
  answerBasis: "knowledge" | "general";
  coverage: "high" | "medium" | "none";
}

export type PersistedRetrievalReference =
  | (CurrentRetrievalReference & { lineage_origin: "current" })
  | { revision_id: string; lineage_origin: "history" };

export const MAX_BUFFERED_CHAT_BYTES = 49_152;

/** Keep uncommitted model output private and place a hard cap on memory use. */
export class BoundedChatBuffer {
  readonly #limit: number;
  #bytes = 0;
  #parts: string[] = [];

  constructor(limit = MAX_BUFFERED_CHAT_BYTES) {
    if (!Number.isSafeInteger(limit) || limit <= 0) {
      throw new Error("Buffered chat limit must be a positive integer");
    }
    this.#limit = limit;
  }

  append(value: string): void {
    if (!value) return;
    const nextBytes = new TextEncoder().encode(value).byteLength;
    if (this.#bytes + nextBytes > this.#limit) {
      throw new Error("Buffered instructor answer exceeded the safe limit");
    }
    this.#bytes += nextBytes;
    this.#parts.push(value);
  }

  text(): string {
    return this.#parts.join("");
  }

  get byteLength(): number {
    return this.#bytes;
  }
}

export interface ChatReleaseEvent {
  event: "retrieved_sources" | "delta" | "done" | "error";
  payload: Record<string, unknown>;
}

interface CommittedChatPayload {
  sources: Array<Record<string, unknown>>;
  answer: string;
  done: Record<string, unknown>;
}

/** A failed commit ignores every buffered argument and releases one generic error. */
export function committedChatReleaseEvents(
  committed: boolean,
  buffered?: CommittedChatPayload,
): ChatReleaseEvent[] {
  if (!committed || !buffered) {
    return [{
      event: "error",
      payload: {
        error: "Instructor response is temporarily unavailable",
        code: "instructor_unavailable",
      },
    }];
  }
  return [
    { event: "retrieved_sources", payload: { sources: buffered.sources } },
    { event: "delta", payload: { text: buffered.answer } },
    { event: "done", payload: buffered.done },
  ];
}

/** Heartbeats carry no model text, citations, revision ids, or similarity. */
export function chatProgressPayload(): Record<string, unknown> {
  return { phase: "generating" };
}

/** Accept only the persisted answer returned by the commit-time RPC. */
export function parseAuthorizedChatCommit(value: unknown): AuthorizedChatCommit | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (
    payload.state !== "committed" ||
    typeof payload.message_id !== "string" || !payload.message_id ||
    typeof payload.answer !== "string" || !payload.answer.trim() ||
    (payload.answer_basis !== "knowledge" && payload.answer_basis !== "general") ||
    (payload.coverage !== "high" && payload.coverage !== "medium" && payload.coverage !== "none") ||
    !Array.isArray(payload.citations) || payload.citations.length > 12 ||
    !payload.citations.every((citation) => (
      citation !== null && typeof citation === "object" && !Array.isArray(citation)
    ))
  ) {
    return null;
  }
  return {
    messageId: payload.message_id,
    answer: payload.answer,
    citations: payload.citations as Array<Record<string, unknown>>,
    answerBasis: payload.answer_basis,
    coverage: payload.coverage,
  };
}

/** Carry all prior authorised evidence into the next stored answer's lineage. */
export function buildPersistedRetrievalLineage(
  current: CurrentRetrievalReference[],
  history: RightsSafeHistoryTurn[],
): PersistedRetrievalReference[] {
  const output: PersistedRetrievalReference[] = current.map((reference) => ({
    ...reference,
    lineage_origin: "current",
  }));
  const seen = new Set(current.map((reference) => reference.revision_id));
  for (const turn of history) {
    if (!Array.isArray(turn.revision_ids)) continue;
    for (const candidate of turn.revision_ids) {
      if (typeof candidate !== "string") continue;
      const revisionId = candidate.trim();
      if (!revisionId || seen.has(revisionId)) continue;
      seen.add(revisionId);
      output.push({ revision_id: revisionId, lineage_origin: "history" });
    }
  }
  return output;
}

/** Treat malformed or unknown RPC payloads as unavailable; never expose their answer field. */
export function parseRightsSafeReplay(value: unknown): RightsSafeReplayResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { state: "unavailable", answer: null };
  }
  const payload = value as Record<string, unknown>;
  if (
    payload.state === "missing" ||
    payload.state === "payload_mismatch" ||
    payload.state === "sources_unavailable"
  ) {
    return { state: payload.state, answer: null };
  }
  if (
    payload.state === "ready" && payload.answer &&
    typeof payload.answer === "object" && !Array.isArray(payload.answer)
  ) {
    const answer = payload.answer as Record<string, unknown>;
    if (typeof answer.id === "string" && typeof answer.content === "string") {
      return { state: "ready", answer };
    }
  }
  return { state: "unavailable", answer: null };
}
