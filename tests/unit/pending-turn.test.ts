import { describe, expect, it, vi } from "vitest";
import { clearPendingRequest, pendingRequestId } from "@/components/ask/pendingTurn";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

describe("pending instructor turns", () => {
  it("reuses the same request id for a retry of the same pending question", () => {
    const storage = memoryStorage();
    vi.spyOn(crypto, "randomUUID").mockReturnValueOnce("11111111-1111-4111-8111-111111111111");
    const first = pendingRequestId(storage, "conversation-a", "same question", 1_000);
    const retry = pendingRequestId(storage, "conversation-a", "same question", 2_000);
    expect(retry).toBe(first);
  });

  it("clears only the matching completed request", () => {
    const storage = memoryStorage();
    const requestId = pendingRequestId(storage, "conversation-a", "question", 1_000);
    clearPendingRequest(storage, "conversation-a", "different-id");
    expect(pendingRequestId(storage, "conversation-a", "question", 2_000)).toBe(requestId);
    clearPendingRequest(storage, "conversation-a", requestId);
    expect(pendingRequestId(storage, "conversation-a", "question", 2_000)).not.toBe(requestId);
  });

  it("replaces malformed ids and future timestamps instead of replaying bad state", () => {
    const storage = memoryStorage();
    pendingRequestId(storage, "conversation-a", "question", 1_000);
    const storageKey = storage.key(0);
    expect(storageKey).not.toBeNull();
    storage.setItem(storageKey!, JSON.stringify({
      conversationId: "conversation-a",
      question: "question",
      requestId: "not-a-uuid",
      createdAt: 9_999_999,
    }));

    const replacement = pendingRequestId(storage, "conversation-a", "question", 2_000);
    expect(replacement).toMatch(/^[0-9a-f-]{36}$/i);
    expect(replacement).not.toBe("not-a-uuid");
  });
});
