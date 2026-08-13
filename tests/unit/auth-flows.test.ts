import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  signUp: vi.fn(),
  updateUser: vi.fn(),
  signInWithOAuth: vi.fn(),
  resend: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseReady: true,
  supabase: { auth },
}));

import {
  resendSignupConfirmation,
  sendPasswordReset,
  signInWithGoogle,
  signUpWithPassword,
  updatePassword,
} from "@/components/auth/member";

describe("member auth flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getSession.mockResolvedValue({ data: { session: null } });
    auth.signUp.mockResolvedValue({ data: {}, error: null });
    auth.updateUser.mockResolvedValue({ data: {}, error: null });
    auth.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
    auth.resend.mockResolvedValue({ data: {}, error: null });
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  });

  it("creates an email/password account with an allowlisted callback", async () => {
    await expect(
      signUpWithPassword(" member@example.com ", "TestOnly9!", "/account")
    ).resolves.toEqual({ ok: true });

    expect(auth.signUp).toHaveBeenCalledWith({
      email: "member@example.com",
      password: "TestOnly9!",
      options: { emailRedirectTo: "http://localhost:3000/account" },
    });
  });

  it("upgrades an anonymous visitor instead of creating a second user", async () => {
    auth.getSession.mockResolvedValue({
      data: { session: { user: { is_anonymous: true } } },
    });

    await signUpWithPassword("member@example.com", "TestOnly9!", "/account");

    expect(auth.updateUser).toHaveBeenCalledWith(
      { email: "member@example.com", password: "TestOnly9!" },
      { emailRedirectTo: "http://localhost:3000/account" }
    );
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("starts Google OAuth with the same safe callback", async () => {
    await expect(signInWithGoogle("/account")).resolves.toEqual({ ok: true });
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "http://localhost:3000/account" },
    });
  });

  it("returns Supabase signup errors to the form", async () => {
    auth.signUp.mockResolvedValue({ data: {}, error: { message: "User already registered" } });
    await expect(
      signUpWithPassword("member@example.com", "TestOnly9!")
    ).resolves.toEqual({ ok: false, error: "User already registered" });
  });

  it("resends confirmation with the original safe callback", async () => {
    await expect(
      resendSignupConfirmation("member@example.com", "/account")
    ).resolves.toEqual({ ok: true });
    expect(auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "member@example.com",
      options: { emailRedirectTo: "http://localhost:3000/account" },
    });
  });

  it("sends password recovery only to the dedicated reset route", async () => {
    await expect(sendPasswordReset("member@example.com")).resolves.toEqual({ ok: true });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("member@example.com", {
      redirectTo: "http://localhost:3000/reset-password",
    });
  });

  it("updates the password inside a valid recovery session", async () => {
    await expect(updatePassword("NewPassword9!")).resolves.toEqual({ ok: true });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "NewPassword9!" });
  });
});
