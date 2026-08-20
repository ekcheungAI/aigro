import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  conversationIdForSession,
  deleteSession,
  type SessionStore,
} from "@/components/ask/sessions";

const CONVERSATION_ID = "43000000-0000-4000-8000-000000000001";
const askPage = readFileSync("src/pages/Ask.tsx", "utf8");
const chatStateMigration = readFileSync(
  "supabase/migrations/20260820320000_idempotent_chat_create_and_crm_delete_rollup.sql",
  "utf8",
);

function linkedStore(): SessionStore {
  return {
    sessions: {
      "elvin-cheung": [{
        id: "linked-session",
        title: "需要可靠刪除",
        createdAt: 1,
        updatedAt: 1,
        messages: [{ id: 1, role: "user", text: "私人問題" }],
        conversationId: CONVERSATION_ID,
      }],
    },
    active: { "elvin-cheung": "linked-session" },
  };
}

function pendingStore(sessionId: string): SessionStore {
  return {
    sessions: {
      "elvin-cheung": [{
        id: sessionId,
        title: "建立中嘅對話",
        createdAt: 1,
        updatedAt: 1,
        messages: [],
      }],
    },
    active: { "elvin-cheung": sessionId },
  };
}

describe("Ask server conversation deletion", () => {
  it("keeps the local session and server id available when remote deletion fails", async () => {
    let attempts = 0;
    const store = linkedStore();

    const result = await deleteSession(store, "elvin-cheung", "linked-session", {
      deleteRemoteConversation: async (conversationId) => {
        attempts += 1;
        expect(conversationId).toBe(CONVERSATION_ID);
        return false;
      },
    });

    expect(attempts).toBe(1);
    expect(result.status).toBe("retry-required");
    expect(result.store).toBe(store);
    expect(result.store.sessions["elvin-cheung"][0].conversationId).toBe(CONVERSATION_ID);
  });

  it("removes local state only after the known server conversation is deleted", async () => {
    const result = await deleteSession(linkedStore(), "elvin-cheung", "linked-session", {
      deleteRemoteConversation: async () => true,
    });

    expect(result.status).toBe("deleted");
    expect(result.store.sessions["elvin-cheung"]).toEqual([]);
    expect(result.store.active["elvin-cheung"]).toBeNull();
  });

  it("waits for an in-flight conversation create before deleting the session", async () => {
    const sessionId = "pending-session-success";
    let deletedConversationId: string | null = null;

    const result = await deleteSession(pendingStore(sessionId), "elvin-cheung", sessionId, {
      pendingConversationId: Promise.resolve(CONVERSATION_ID),
      deleteRemoteConversation: async (conversationId) => {
        deletedConversationId = conversationId;
        return true;
      },
    });

    expect(deletedConversationId).toBe(CONVERSATION_ID);
    expect(result.status).toBe("deleted");
    expect(result.store.sessions["elvin-cheung"]).toEqual([]);
  });

  it("keeps a newly created server id available when deletion genuinely fails", async () => {
    const sessionId = "pending-session-failure";
    const store = pendingStore(sessionId);

    const first = await deleteSession(store, "elvin-cheung", sessionId, {
      pendingConversationId: Promise.resolve(CONVERSATION_ID),
      deleteRemoteConversation: async () => false,
    });

    expect(first.status).toBe("retry-required");
    expect(first.store).toBe(store);
    expect(conversationIdForSession(sessionId)).toBe(CONVERSATION_ID);

    const retry = await deleteSession(first.store, "elvin-cheung", sessionId, {
      deleteRemoteConversation: async () => true,
    });
    expect(retry.status).toBe("deleted");
    expect(conversationIdForSession(sessionId)).toBeNull();
  });

  it("uses the idempotent owner-scoped delete RPC for acknowledgement-loss retries", () => {
    const sessionsSource = readFileSync("src/components/ask/sessions.ts", "utf8");
    expect(sessionsSource).toContain('.rpc("delete_chat_conversation"');
  });

  it("keeps durable delete intent and legacy create outside the browser boundary", () => {
    expect(chatStateMigration).toContain("create table public.chat_conversation_tombstones");
    expect(chatStateMigration).toContain("raise exception 'conversation_deleted'");
    expect(chatStateMigration).toMatch(
      /revoke all on function public\.create_chat_conversation\(text, text\)[\s\S]*?from public, anon, authenticated/,
    );
  });

  it("does not destructively backfill CRM rollups from incomplete legacy interactions", () => {
    expect(chatStateMigration).not.toMatch(
      /select\s+public\.recompute_lead_crm_rollup\(id\)\s+from\s+public\.leads/i,
    );
  });

  it("surfaces a retry-required server deletion instead of hiding the session", () => {
    expect(askPage).toContain('result.status === "retry-required"');
    expect(askPage).toContain("伺服器暫時未能刪除");
  });
});
