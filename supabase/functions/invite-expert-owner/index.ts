import { createClient } from "@supabase/supabase-js";
import {
  createExpertInvitationHandler,
  type CallerInvitationGateway,
  type ServiceInvitationGateway,
} from "../_shared/expert-invitation.ts";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://aigro-blue.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
] as const;

function requiredEnvironment(
  names: readonly string[],
): string {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) return value;
  }
  throw new Error("edge_function_configuration_missing");
}

function supabaseUrl(): string {
  return requiredEnvironment(["SUPABASE_URL"]);
}

function publishableKey(): string {
  return requiredEnvironment([
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
  ]);
}

function serviceKey(): string {
  return requiredEnvironment([
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]);
}

function configuredAllowedOrigins(): string[] {
  const configured = Deno.env.get("ALLOWED_ORIGINS");
  if (!configured?.trim()) return [...DEFAULT_ALLOWED_ORIGINS];
  return configured.split(",").map((origin) => origin.trim()).filter(Boolean);
}

function createCallerGateway(token: string): CallerInvitationGateway {
  const client = createClient(supabaseUrl(), publishableKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  return {
    async authenticate() {
      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user) return null;
      return { id: data.user.id };
    },
    async getProtectedRole(userId) {
      const { data, error } = await client
        .from("account_access")
        .select("app_role")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return typeof data?.app_role === "string" ? data.app_role : null;
    },
    async createInvitation(expertId, email) {
      const { data, error } = await client.rpc("create_expert_invitation", {
        p_expert_id: expertId,
        p_email: email,
      });
      if (error) throw error;
      if (typeof data !== "string") {
        throw new Error("invalid_invitation_rpc_response");
      }
      return data;
    },
  };
}

function createServiceGateway(): ServiceInvitationGateway {
  // Resolve and validate service configuration before the handler accepts any
  // request. A missing secret must fail function startup, not create a durable
  // invitation that the same unavailable service client cannot roll back.
  const client = createClient(supabaseUrl(), serviceKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return {
    async inviteByEmail(email, redirectTo) {
      const { error } = await client.auth.admin.inviteUserByEmail(email, {
        redirectTo,
      });
      if (error) throw error;
    },
    async cancelInvitation(invitationId, reason) {
      const { error } = await client.rpc("cancel_expert_invitation", {
        p_invitation_id: invitationId,
        p_reason: reason,
      });
      if (error) throw error;
    },
  };
}

const handler = createExpertInvitationHandler({
  allowedOrigins: configuredAllowedOrigins(),
  publicSiteUrl: Deno.env.get("PUBLIC_SITE_URL"),
  createCallerGateway,
  serviceGateway: createServiceGateway(),
});

Deno.serve(handler);
