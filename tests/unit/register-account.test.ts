import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { registerAccount } from "@/lib/registerAccount";

function clientWith(auth: Record<string, unknown>): SupabaseClient {
  return { auth } as unknown as SupabaseClient;
}

const input = {
  email: " New@Example.com ",
  password: "Strong-pass-123",
  name: "New Member",
  interests: ["自動化"],
  persona: "Founder",
  requestedTier: "vip" as const,
  redirectTo: "https://aigro-blue.vercel.app/account",
};

describe("registerAccount", () => {
  it("creates a real password account without trusting requested access metadata", async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: { user: { id: "user-1" }, session: null },
      error: null,
    });
    const client = clientWith({
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signUp,
    });

    const result = await registerAccount(client, input);

    expect(result).toEqual({
      ok: true,
      userId: "user-1",
      emailConfirmationRequired: true,
    });
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: "new@example.com",
      password: input.password,
    }));
    const payload = signUp.mock.calls[0][0];
    expect(payload.options.data).toMatchObject({ requested_plan: "vip" });
    expect(payload.options.data).not.toHaveProperty("role");
    expect(payload.options.data).not.toHaveProperty("tier");
  });

  it("upgrades an anonymous visitor so existing owned chats stay attached", async () => {
    const updateUser = vi.fn().mockResolvedValue({
      data: { user: { id: "anon-user", email_confirmed_at: null } },
      error: null,
    });
    const signUp = vi.fn();
    const client = clientWith({
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "anon-user", is_anonymous: true } } },
        error: null,
      }),
      updateUser,
      signUp,
    });

    const result = await registerAccount(client, input);

    expect(result.ok).toBe(true);
    expect(result.userId).toBe("anon-user");
    expect(updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "new@example.com", password: input.password }),
      { emailRedirectTo: input.redirectTo }
    );
    expect(signUp).not.toHaveBeenCalled();
  });

  it("returns provider errors without reporting a successful account", async () => {
    const client = clientWith({
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "email already registered" },
      }),
    });

    await expect(registerAccount(client, input)).resolves.toEqual({
      ok: false,
      error: "email already registered",
    });
  });
});
