import type { SupabaseClient } from "@supabase/supabase-js";

export interface RegisterAccountInput {
  email: string;
  password: string;
  name: string;
  interests: string[];
  persona: string | null;
  requestedTier: "free" | "pro" | "vip";
  redirectTo: string;
}

export interface RegisterAccountResult {
  ok: boolean;
  userId?: string;
  emailConfirmationRequired?: boolean;
  error?: string;
}

/**
 * Create a permanent email/password identity. If Ask already created an
 * anonymous Supabase user, upgrade that same identity so its owned chat history
 * stays attached. Role/tier are deliberately not written to authorization data.
 */
export async function registerAccount(
  client: SupabaseClient,
  input: RegisterAccountInput
): Promise<RegisterAccountResult> {
  const email = input.email.trim().toLowerCase();
  const metadata = {
    name: input.name.trim(),
    interests: input.interests,
    persona: input.persona,
    requested_plan: input.requestedTier,
  };
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) return { ok: false, error: sessionError.message };

  if (sessionData.session?.user.is_anonymous) {
    const { data, error } = await client.auth.updateUser(
      { email, password: input.password, data: metadata },
      { emailRedirectTo: input.redirectTo }
    );
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      userId: data.user?.id,
      emailConfirmationRequired: !data.user?.email_confirmed_at,
    };
  }

  const { data, error } = await client.auth.signUp({
    email,
    password: input.password,
    options: {
      emailRedirectTo: input.redirectTo,
      data: metadata,
    },
  });
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    userId: data.user?.id,
    emailConfirmationRequired: !data.session,
  };
}
