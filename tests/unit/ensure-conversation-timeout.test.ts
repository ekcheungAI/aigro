import { describe, expect, it } from "vitest";
import {
  conversationIdForSession,
  deleteSession,
  ensureConversationId,
  type SessionStore,
} from "@/components/ask/sessions";

const CONVERSATION_ID = "44000000-0000-4000-8000-000000000001";

function storeFor(sessionId: string): SessionStore {
  return {
    sessions: {
      "elvin-cheung": [{
        id: sessionId,
        title: "建立中",
        createdAt: 1,
        updatedAt: 1,
        messages: [],
      }],
    },
    active: { "elvin-cheung": sessionId },
  };
}

describe("conversation creation deadline", () => {
  it("times out authentication and never starts a late create", async () => {
    let resolveAuth!: (userId: string) => void;
    let creates = 0;
    const auth = new Promise<string>((resolve) => {
      resolveAuth = resolve;
    });

    const result = await ensureConversationId(
      "auth-timeout-session",
      "elvin-cheung",
      "Auth timeout",
      {
        authenticate: () => auth,
        createConversation: async () => {
          creates += 1;
          return CONVERSATION_ID;
        },
        timeoutMs: 10,
      },
    );

    expect(result).toBeNull();
    resolveAuth("user-after-timeout");
    await Promise.resolve();
    expect(creates).toBe(0);
  });

  it("aborts an in-flight create RPC at the shared deadline", async () => {
    let aborted = false;
    const result = await ensureConversationId(
      "create-timeout-session",
      "elvin-cheung",
      "Create timeout",
      {
        authenticate: async () => "owner-id",
        createConversation: (_input, signal) => new Promise((resolve) => {
          signal.addEventListener("abort", () => {
            aborted = true;
            resolve(null);
          }, { once: true });
        }),
        timeoutMs: 10,
      },
    );

    expect(result).toBeNull();
    expect(aborted).toBe(true);
  });

  it("keeps the client id deletable when create commits but its response is lost", async () => {
    const sessionId = "create-ack-loss-session";
    let committedId: string | null = null;
    const result = await ensureConversationId(
      sessionId,
      "elvin-cheung",
      "Lost acknowledgement",
      {
        authenticate: async () => "owner-id",
        createConversation: (input, signal) => new Promise((resolve) => {
          committedId = input.conversationId;
          signal.addEventListener("abort", () => resolve(null), { once: true });
        }),
        timeoutMs: 10,
      },
    );

    expect(result).toBeNull();
    expect(committedId).toMatch(/^[0-9a-f-]{36}$/);
    expect(conversationIdForSession(sessionId)).toBe(committedId);

    let deletedId: string | null = null;
    const deletion = await deleteSession(storeFor(sessionId), "elvin-cheung", sessionId, {
      deleteRemoteConversation: async (conversationId) => {
        deletedId = conversationId;
        return true;
      },
    });
    expect(deletedId).toBe(committedId);
    expect(deletion.status).toBe("deleted");
    expect(conversationIdForSession(sessionId)).toBeNull();
  });

  it("never reuses a persisted conversation UUID after the auth owner changes", async () => {
    const sessionId = "owner-switch-session";
    const first = await ensureConversationId(sessionId, "elvin-cheung", "First owner", {
      authenticate: async () => "owner-one",
      createConversation: async (input) => input.conversationId,
      timeoutMs: 1_000,
    });
    expect(first).toMatch(/^[0-9a-f-]{36}$/);

    let secondInputOwner: string | null = null;
    const second = await ensureConversationId(sessionId, "elvin-cheung", "Second owner", {
      authenticate: async () => "owner-two",
      createConversation: async (input) => {
        secondInputOwner = input.ownerId;
        return input.conversationId;
      },
      timeoutMs: 1_000,
    });

    expect(secondInputOwner).toBe("owner-two");
    expect(second).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).not.toBe(first);
    expect(conversationIdForSession(sessionId)).toBe(second);
  });

  it("still hands an in-flight create id to deletion before removing local state", async () => {
    const sessionId = "timeout-delete-race-session";
    let resolveCreate!: () => void;
    let createdId: string | null = null;
    let markCreateStarted!: () => void;
    const createStarted = new Promise<void>((resolve) => {
      markCreateStarted = resolve;
    });
    const pending = ensureConversationId(sessionId, "elvin-cheung", "Delete race", {
      authenticate: async () => "owner-id",
      createConversation: (input) => new Promise((resolve) => {
        createdId = input.conversationId;
        resolveCreate = () => resolve(input.conversationId);
        markCreateStarted();
      }),
      timeoutMs: 1_000,
    });
    await createStarted;

    let deletedId: string | null = null;
    const deletion = deleteSession(storeFor(sessionId), "elvin-cheung", sessionId, {
      deleteRemoteConversation: async (conversationId) => {
        deletedId = conversationId;
        return true;
      },
    });
    resolveCreate();

    // The initiating UI path is masked by the tombstone, while deleteSession
    // receives the raw in-flight id from the shared pending map.
    expect(await pending).toBeNull();
    const result = await deletion;
    expect(deletedId).toBe(createdId);
    expect(result.status).toBe("deleted");
    expect(conversationIdForSession(sessionId)).toBeNull();
  });
});
