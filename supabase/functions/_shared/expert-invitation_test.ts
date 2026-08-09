import {
  buildInvitationRedirect,
  createExpertInvitationHandler,
  type CallerInvitationGateway,
  normalizeInvitationEmail,
  type ServiceInvitationGateway,
} from "./expert-invitation.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(
  actual: unknown,
  expected: unknown,
  message: string,
): void {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) {
    throw new Error(`${message}: expected ${right}, got ${left}`);
  }
}

const ALLOWED_ORIGIN = "https://aigro-blue.vercel.app";
const USER_ID = "0f6bcf2e-2f9d-44b5-a623-2db5e9395eaa";
const EXPERT_ID = "4b84c858-fdd8-4a7f-9500-4b4086757d20";
const INVITATION_ID = "386ef5f9-4a6e-423e-80f3-d7e3d2d6ec6b";

interface FakeOptions {
  authenticatedUserId?: string | null;
  role?: string | null;
  invitationId?: string;
  authenticateError?: unknown;
  roleError?: unknown;
  createError?: unknown;
  inviteError?: unknown;
  cancelError?: unknown;
  publicSiteUrl?: string;
}

interface Calls {
  bearerTokens: string[];
  roleUserIds: string[];
  creates: Array<{ expertId: string; email: string }>;
  invites: Array<{ email: string; redirectTo: string }>;
  cancellations: Array<{ invitationId: string; reason: string }>;
}

function harness(options: FakeOptions = {}) {
  const calls: Calls = {
    bearerTokens: [],
    roleUserIds: [],
    creates: [],
    invites: [],
    cancellations: [],
  };
  const caller: CallerInvitationGateway = {
    authenticate() {
      if (options.authenticateError) {
        return Promise.reject(options.authenticateError);
      }
      const id = options.authenticatedUserId === undefined
        ? USER_ID
        : options.authenticatedUserId;
      return Promise.resolve(id ? { id } : null);
    },
    getProtectedRole(userId) {
      calls.roleUserIds.push(userId);
      if (options.roleError) return Promise.reject(options.roleError);
      return Promise.resolve(
        options.role === undefined ? "super_admin" : options.role,
      );
    },
    createInvitation(expertId, email) {
      calls.creates.push({ expertId, email });
      if (options.createError) return Promise.reject(options.createError);
      return Promise.resolve(options.invitationId ?? INVITATION_ID);
    },
  };
  const service: ServiceInvitationGateway = {
    inviteByEmail(email, redirectTo) {
      calls.invites.push({ email, redirectTo });
      return options.inviteError
        ? Promise.reject(options.inviteError)
        : Promise.resolve();
    },
    cancelInvitation(invitationId, reason) {
      calls.cancellations.push({ invitationId, reason });
      return options.cancelError
        ? Promise.reject(options.cancelError)
        : Promise.resolve();
    },
  };
  const handler = createExpertInvitationHandler({
    allowedOrigins: [ALLOWED_ORIGIN, "http://localhost:3000"],
    publicSiteUrl: options.publicSiteUrl,
    createCallerGateway(token) {
      calls.bearerTokens.push(token);
      return caller;
    },
    serviceGateway: service,
  });
  return { calls, handler };
}

function postRequest(
  body: unknown,
  options: { authorization?: string | null; origin?: string | null } = {},
): Request {
  const headers = new Headers({ "content-type": "application/json" });
  const authorization = options.authorization === undefined
    ? "Bearer caller.jwt.token"
    : options.authorization;
  const origin = options.origin === undefined ? ALLOWED_ORIGIN : options.origin;
  if (authorization) headers.set("authorization", authorization);
  if (origin) headers.set("origin", origin);
  return new Request("https://project.supabase.co/functions/v1/invite-expert-owner", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function responseBody(response: Response): Promise<Record<string, unknown>> {
  return await response.json() as Record<string, unknown>;
}

Deno.test("normalizes a valid instructor email without preserving surrounding whitespace", () => {
  assertEquals(
    normalizeInvitationEmail("  Instructor@AIGRO.HK  "),
    "instructor@aigro.hk",
    "email must be trimmed and lowercased",
  );
});

Deno.test("rejects a request without a caller JWT before constructing a caller client", async () => {
  const { calls, handler } = harness();
  const response = await handler(postRequest({
    expert_id: EXPERT_ID,
    email: "instructor@aigro.hk",
  }, { authorization: null }));

  assertEquals(response.status, 401, "missing bearer token must be unauthorized");
  assertEquals((await responseBody(response)).code, "authentication_required", "response code");
  assertEquals(calls.bearerTokens, [], "no caller-scoped client may be built without a token");
});

Deno.test("rejects an invalid caller JWT", async () => {
  const { calls, handler } = harness({ authenticatedUserId: null });
  const response = await handler(postRequest({
    expert_id: EXPERT_ID,
    email: "instructor@aigro.hk",
  }));

  assertEquals(response.status, 401, "invalid bearer token must be unauthorized");
  assertEquals(calls.bearerTokens, ["caller.jwt.token"], "original JWT must scope the caller client");
  assertEquals(calls.creates, [], "invalid caller cannot create an invitation");
});

Deno.test("authorizes from protected account_access role and never a body actor", async () => {
  const { calls, handler } = harness({ role: "admin" });
  const response = await handler(postRequest({
    expert_id: EXPERT_ID,
    email: "instructor@aigro.hk",
    actor_user_id: "00000000-0000-0000-0000-000000000001",
    app_role: "super_admin",
  }));

  assertEquals(response.status, 403, "only the protected super_admin role may invite");
  assertEquals(calls.roleUserIds, [USER_ID], "role lookup must use the authenticated user id");
  assertEquals(calls.creates, [], "unprivileged callers cannot reach invitation RPC");
  assertEquals(calls.invites, [], "unprivileged callers cannot reach auth admin");
});

Deno.test("rejects malformed, control-character, and overlong emails before database calls", async () => {
  const invalidEmails = [
    "not-an-email",
    "teacher\n@aigro.hk",
    `${"a".repeat(245)}@aigro.hk`,
  ];
  for (const email of invalidEmails) {
    const { calls, handler } = harness();
    const response = await handler(postRequest({ expert_id: EXPERT_ID, email }));
    assertEquals(response.status, 400, "invalid email must be rejected");
    assertEquals((await responseBody(response)).code, "invalid_email", "safe invalid email code");
    assertEquals(calls.creates, [], "invalid email must not reach invitation RPC");
  }
});

Deno.test("rejects a malformed expert id before authentication or database calls", async () => {
  const { calls, handler } = harness();
  const response = await handler(postRequest({
    expert_id: "../../other-expert",
    email: "instructor@aigro.hk",
  }));

  assertEquals(response.status, 400, "expert id must be a UUID");
  assertEquals((await responseBody(response)).code, "invalid_expert_id", "safe UUID error code");
  assertEquals(calls.bearerTokens, [], "invalid body must be rejected before auth client creation");
});

Deno.test("allows only configured CORS origins", async () => {
  const { calls, handler } = harness();
  const response = await handler(postRequest({
    expert_id: EXPERT_ID,
    email: "instructor@aigro.hk",
  }, { origin: "https://attacker.example" }));

  assertEquals(response.status, 403, "unconfigured browser origin must be rejected");
  assertEquals(response.headers.get("access-control-allow-origin"), null, "must not reflect attacker origin");
  assertEquals(calls.bearerTokens, [], "CORS rejection must occur before auth");

  const preflight = await handler(new Request(
    "https://project.supabase.co/functions/v1/invite-expert-owner",
    { method: "OPTIONS", headers: { origin: ALLOWED_ORIGIN } },
  ));
  assertEquals(preflight.status, 204, "allowed preflight must succeed");
  assertEquals(preflight.headers.get("access-control-allow-origin"), ALLOWED_ORIGIN, "exact allowed origin");
  assertEquals(preflight.headers.get("vary"), "Origin", "caches must vary on Origin");
});

Deno.test("builds a fixed account redirect and falls back from unsafe site URLs", () => {
  assertEquals(
    buildInvitationRedirect("https://preview.aigro.hk/subpath?next=https://evil.example#x", INVITATION_ID),
    `https://preview.aigro.hk/account?expert_invitation=${INVITATION_ID}`,
    "site path, query, and fragment must not influence redirect path",
  );
  for (const unsafe of [
    "javascript:alert(1)",
    "http://evil.example",
    "https://user:password@evil.example",
    "not a URL",
  ]) {
    assertEquals(
      buildInvitationRedirect(unsafe, INVITATION_ID),
      `${ALLOWED_ORIGIN}/account?expert_invitation=${INVITATION_ID}`,
      "unsafe public site URL must fall back to production",
    );
  }
});

Deno.test("creates through caller scope and sends a normalized invitation with the safe redirect", async () => {
  const { calls, handler } = harness({
    publicSiteUrl: "https://preview.aigro.hk/base?unsafe=1",
  });
  const response = await handler(postRequest({
    expert_id: EXPERT_ID,
    email: "  Instructor@AIGRO.HK  ",
  }));
  const body = await responseBody(response);

  assertEquals(response.status, 201, "successful invitation must create a resource");
  assertEquals(body, {
    ok: true,
    code: "invitation_sent",
    invitation_id: INVITATION_ID,
  }, "success response must not echo email or credentials");
  assertEquals(calls.creates, [{ expertId: EXPERT_ID, email: "instructor@aigro.hk" }], "caller RPC arguments");
  assertEquals(calls.invites, [{
    email: "instructor@aigro.hk",
    redirectTo: `https://preview.aigro.hk/account?expert_invitation=${INVITATION_ID}`,
  }], "service invite arguments");
  assertEquals(calls.cancellations, [], "successful invitation must not roll back");
  assertEquals(response.headers.get("access-control-allow-origin"), ALLOWED_ORIGIN, "success CORS origin");
});

Deno.test("rolls back a provider failure and returns no provider detail or PII", async () => {
  const providerMessage = "SMTP rejected secret.user@aigro.hk using provider-key-123";
  const { calls, handler } = harness({
    inviteError: { status: 503, code: "smtp_failure", message: providerMessage },
  });
  const response = await handler(postRequest({
    expert_id: EXPERT_ID,
    email: "secret.user@aigro.hk",
  }));
  const body = await responseBody(response);
  const serialized = JSON.stringify(body);

  assertEquals(response.status, 502, "provider outage must be a safe gateway error");
  assertEquals(body.code, "invitation_provider_failed", "safe provider code");
  assert(!serialized.includes("secret.user"), "response must not expose email");
  assert(!serialized.includes("provider-key"), "response must not expose provider detail");
  assertEquals(calls.cancellations, [{
    invitationId: INVITATION_ID,
    reason: "invite_provider_failed",
  }], "failed provider invite must cancel durable invitation with sanitized reason");
});

Deno.test("rolls back and gives Members guidance when the email already has an account", async () => {
  const { calls, handler } = harness({
    inviteError: {
      status: 422,
      code: "email_exists",
      message: "A user with this email address has already been registered",
    },
  });
  const response = await handler(postRequest({
    expert_id: EXPERT_ID,
    email: "existing@aigro.hk",
  }));
  const body = await responseBody(response);

  assertEquals(response.status, 409, "registered account must return conflict");
  assertEquals(body.code, "expert_account_exists", "safe existing account code");
  assert(
    typeof body.message === "string" && body.message.includes("Members"),
    "admin must be instructed to assign the account through Members",
  );
  assertEquals(calls.cancellations, [{
    invitationId: INVITATION_ID,
    reason: "account_already_registered",
  }], "existing account provider failure must cancel pending invitation");
});

Deno.test("reports a safe recovery error when provider rollback also fails", async () => {
  const { handler } = harness({
    inviteError: new Error("provider included private diagnostic"),
    cancelError: new Error("database included private diagnostic"),
  });
  const response = await handler(postRequest({
    expert_id: EXPERT_ID,
    email: "teacher@aigro.hk",
  }));
  const body = await responseBody(response);

  assertEquals(response.status, 503, "failed compensation needs operator recovery");
  assertEquals(body.code, "invitation_rollback_failed", "safe recovery code");
  assert(!JSON.stringify(body).includes("private diagnostic"), "raw errors must stay private");
});

Deno.test("does not expose caller RPC failures", async () => {
  const { calls, handler } = harness({
    createError: new Error("database secret and instructor@example.com"),
  });
  const response = await handler(postRequest({
    expert_id: EXPERT_ID,
    email: "instructor@example.com",
  }));
  const body = await responseBody(response);

  assertEquals(response.status, 503, "RPC failure must be retryable without provider use");
  assertEquals(body.code, "invitation_create_failed", "safe create error code");
  assert(!JSON.stringify(body).includes("database secret"), "raw database errors must stay private");
  assertEquals(calls.invites, [], "provider must not run if durable invitation creation failed");
  assertEquals(calls.cancellations, [], "there is no invitation to cancel after RPC failure");
});
