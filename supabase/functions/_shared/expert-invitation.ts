export const DEFAULT_PUBLIC_SITE_URL = "https://aigro-blue.vercel.app";

const MAX_EMAIL_LENGTH = 254;
const MAX_EMAIL_LOCAL_PART_LENGTH = 64;
const MAX_REQUEST_BYTES = 4_096;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOMAIN_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const LOCAL_PART_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;

export interface CallerInvitationGateway {
  authenticate(): Promise<{ id: string } | null>;
  getProtectedRole(userId: string): Promise<string | null>;
  createInvitation(expertId: string, email: string): Promise<string>;
}

export interface ServiceInvitationGateway {
  inviteByEmail(email: string, redirectTo: string): Promise<void>;
  cancelInvitation(invitationId: string, reason: string): Promise<void>;
}

export interface ExpertInvitationHandlerOptions {
  allowedOrigins: readonly string[];
  publicSiteUrl?: string | null;
  createCallerGateway(token: string): CallerInvitationGateway;
  serviceGateway: ServiceInvitationGateway;
}

export function normalizeInvitationEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidInvitationEmail(email: string): boolean {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  if (/[^\x21-\x7e]/.test(email)) return false;

  const separator = email.lastIndexOf("@");
  if (separator <= 0 || separator !== email.indexOf("@")) return false;
  const local = email.slice(0, separator);
  const domain = email.slice(separator + 1);
  if (
    local.length > MAX_EMAIL_LOCAL_PART_LENGTH ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..") ||
    !LOCAL_PART_PATTERN.test(local)
  ) {
    return false;
  }

  const labels = domain.split(".");
  return labels.length >= 2 && labels.every((label) =>
    DOMAIN_LABEL_PATTERN.test(label)
  );
}

function safeSiteOrigin(value: string | null | undefined): string {
  if (!value) return DEFAULT_PUBLIC_SITE_URL;
  try {
    const parsed = new URL(value);
    const localHttp = parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (
      (parsed.protocol !== "https:" && !localHttp) ||
      parsed.username ||
      parsed.password ||
      !parsed.hostname
    ) {
      return DEFAULT_PUBLIC_SITE_URL;
    }
    return parsed.origin;
  } catch {
    return DEFAULT_PUBLIC_SITE_URL;
  }
}

export function buildInvitationRedirect(
  publicSiteUrl: string | null | undefined,
  invitationId: string,
): string {
  const redirect = new URL("/account", safeSiteOrigin(publicSiteUrl));
  redirect.searchParams.set("expert_invitation", invitationId);
  return redirect.toString();
}

function configuredOrigin(value: string): string | null {
  try {
    const parsed = new URL(value);
    const localHttp = parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (
      (parsed.protocol !== "https:" && !localHttp) ||
      parsed.username ||
      parsed.password ||
      parsed.origin === "null"
    ) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function corsHeaders(origin: string | null): Headers {
  const headers = new Headers({
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-methods", "POST, OPTIONS");
    headers.set("access-control-allow-headers", "authorization, content-type");
    headers.set("access-control-max-age", "600");
    headers.set("vary", "Origin");
  }
  return headers;
}

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  origin: string | null,
  extraHeaders?: HeadersInit,
): Response {
  const headers = corsHeaders(origin);
  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, key) => headers.set(key, value));
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function safeError(
  status: number,
  code: string,
  message: string,
  origin: string | null,
): Response {
  return jsonResponse(status, { ok: false, code, message }, origin);
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const match = /^Bearer ([^\s]{1,8192})$/.exec(authorization);
  return match?.[1] ?? null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function errorField(error: unknown, key: string): unknown {
  if (error instanceof Error && key === "message") return error.message;
  return record(error)?.[key];
}

function isAlreadyRegisteredError(error: unknown): boolean {
  const code = errorField(error, "code");
  if (
    typeof code === "string" && [
      "email_exists",
      "user_already_exists",
      "email_already_exists",
      "email_already_registered",
    ].includes(code.toLowerCase())
  ) {
    return true;
  }
  const message = errorField(error, "message");
  return typeof message === "string" &&
    /(?:user|email).{0,40}(?:already (?:been )?(?:registered|exists)|exists already)/i
      .test(message);
}

async function invitationBody(
  request: Request,
): Promise<{ expertId: string; email: string } | "too_large" | "invalid"> {
  const declaredSize = request.headers.get("content-length");
  if (declaredSize && Number(declaredSize) > MAX_REQUEST_BYTES) {
    return "too_large";
  }
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return "invalid";
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) {
    return "too_large";
  }
  let parsed: Record<string, unknown> | null;
  try {
    parsed = record(JSON.parse(raw));
  } catch {
    return "invalid";
  }
  if (!parsed) return "invalid";

  const expertId = parsed.expert_id;
  const rawEmail = parsed.email;
  if (typeof expertId !== "string" || !UUID_PATTERN.test(expertId)) {
    return { expertId: "", email: typeof rawEmail === "string" ? rawEmail : "" };
  }
  if (typeof rawEmail !== "string") return { expertId, email: "" };
  return { expertId, email: normalizeInvitationEmail(rawEmail) };
}

export function createExpertInvitationHandler(
  options: ExpertInvitationHandlerOptions,
): (request: Request) => Promise<Response> {
  const allowedOrigins = new Set(
    options.allowedOrigins.map(configuredOrigin).filter(
      (origin): origin is string => origin !== null,
    ),
  );

  return async (request: Request): Promise<Response> => {
    const requestOrigin = request.headers.get("origin");
    const allowedOrigin = requestOrigin && allowedOrigins.has(requestOrigin)
      ? requestOrigin
      : null;
    if (requestOrigin && !allowedOrigin) {
      return safeError(
        403,
        "origin_not_allowed",
        "This request origin is not allowed.",
        null,
      );
    }
    if (request.method === "OPTIONS") {
      if (!allowedOrigin) {
        return safeError(
          403,
          "origin_not_allowed",
          "This request origin is not allowed.",
          null,
        );
      }
      const headers = corsHeaders(allowedOrigin);
      headers.delete("content-type");
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "POST") {
      return safeError(
        405,
        "method_not_allowed",
        "Only POST is supported.",
        allowedOrigin,
      );
    }

    const token = bearerToken(request);
    if (!token) {
      return safeError(
        401,
        "authentication_required",
        "A valid signed-in session is required.",
        allowedOrigin,
      );
    }

    const body = await invitationBody(request);
    if (body === "too_large") {
      return safeError(
        413,
        "request_too_large",
        "The invitation request is too large.",
        allowedOrigin,
      );
    }
    if (body === "invalid") {
      return safeError(
        400,
        "invalid_request",
        "A JSON body with expert_id and email is required.",
        allowedOrigin,
      );
    }
    if (!body.expertId) {
      return safeError(
        400,
        "invalid_expert_id",
        "A valid expert id is required.",
        allowedOrigin,
      );
    }
    if (!isValidInvitationEmail(body.email)) {
      return safeError(
        400,
        "invalid_email",
        "A valid instructor email is required.",
        allowedOrigin,
      );
    }

    let caller: CallerInvitationGateway;
    try {
      caller = options.createCallerGateway(token);
    } catch {
      return safeError(
        503,
        "authentication_unavailable",
        "Authentication is temporarily unavailable.",
        allowedOrigin,
      );
    }

    let user: { id: string } | null;
    try {
      user = await caller.authenticate();
    } catch {
      return safeError(
        503,
        "authentication_unavailable",
        "Authentication is temporarily unavailable.",
        allowedOrigin,
      );
    }
    if (!user?.id) {
      return safeError(
        401,
        "authentication_required",
        "A valid signed-in session is required.",
        allowedOrigin,
      );
    }

    let role: string | null;
    try {
      role = await caller.getProtectedRole(user.id);
    } catch {
      return safeError(
        503,
        "authorization_unavailable",
        "Authorization is temporarily unavailable.",
        allowedOrigin,
      );
    }
    if (role !== "super_admin") {
      return safeError(
        403,
        "super_admin_required",
        "Super administrator access is required.",
        allowedOrigin,
      );
    }

    let invitationId: string;
    try {
      invitationId = await caller.createInvitation(body.expertId, body.email);
    } catch (error) {
      if (isAlreadyRegisteredError(error)) {
        return safeError(
          409,
          "expert_account_exists",
          "This email already has an account. Assign the instructor from Members.",
          allowedOrigin,
        );
      }
      return safeError(
        503,
        "invitation_create_failed",
        "The invitation could not be created. Try again.",
        allowedOrigin,
      );
    }
    if (!UUID_PATTERN.test(invitationId)) {
      return safeError(
        503,
        "invitation_create_failed",
        "The invitation could not be created. Try again.",
        allowedOrigin,
      );
    }

    const redirectTo = buildInvitationRedirect(
      options.publicSiteUrl,
      invitationId,
    );
    try {
      await options.serviceGateway.inviteByEmail(body.email, redirectTo);
    } catch (error) {
      const accountExists = isAlreadyRegisteredError(error);
      try {
        await options.serviceGateway.cancelInvitation(
          invitationId,
          accountExists
            ? "account_already_registered"
            : "invite_provider_failed",
        );
      } catch {
        return safeError(
          503,
          "invitation_rollback_failed",
          "The invitation could not be completed and needs administrator review.",
          allowedOrigin,
        );
      }
      if (accountExists) {
        return safeError(
          409,
          "expert_account_exists",
          "This email already has an account. Assign the instructor from Members.",
          allowedOrigin,
        );
      }
      return safeError(
        502,
        "invitation_provider_failed",
        "The invitation email could not be sent. Try again.",
        allowedOrigin,
      );
    }

    return jsonResponse(201, {
      ok: true,
      code: "invitation_sent",
      invitation_id: invitationId,
    }, allowedOrigin);
  };
}
