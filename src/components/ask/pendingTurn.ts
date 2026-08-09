const PREFIX = "aigro:pending-instructor-turn:";
const MAX_PENDING_AGE_MS = 15 * 60_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface PendingTurn {
  conversationId: string;
  question: string;
  requestId: string;
  createdAt: number;
}

function key(conversationId: string): string {
  return `${PREFIX}${conversationId}`;
}

export function pendingRequestId(
  storage: Pick<Storage, "getItem" | "setItem">,
  conversationId: string,
  question: string,
  now = Date.now(),
): string {
  try {
    const parsed = JSON.parse(storage.getItem(key(conversationId)) ?? "null") as
      Partial<PendingTurn> | null;
    if (
      parsed?.conversationId === conversationId &&
      parsed.question === question &&
      typeof parsed.requestId === "string" &&
      UUID_PATTERN.test(parsed.requestId) &&
      typeof parsed.createdAt === "number" &&
      Number.isFinite(parsed.createdAt) &&
      now - parsed.createdAt >= 0 &&
      now - parsed.createdAt <= MAX_PENDING_AGE_MS
    ) {
      return parsed.requestId;
    }
  } catch {
    // Replace malformed browser state with a fresh idempotency record.
  }
  const requestId = crypto.randomUUID();
  storage.setItem(key(conversationId), JSON.stringify({
    conversationId,
    question,
    requestId,
    createdAt: now,
  } satisfies PendingTurn));
  return requestId;
}

export function clearPendingRequest(
  storage: Pick<Storage, "getItem" | "removeItem">,
  conversationId: string,
  requestId: string,
): void {
  try {
    const parsed = JSON.parse(storage.getItem(key(conversationId)) ?? "null") as
      Partial<PendingTurn> | null;
    if (parsed?.requestId === requestId) storage.removeItem(key(conversationId));
  } catch {
    storage.removeItem(key(conversationId));
  }
}
