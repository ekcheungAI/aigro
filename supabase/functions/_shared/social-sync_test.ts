import {
  assertSafePublicConnection,
  createTikHubPublicProvider,
  type PublicSocialConnection,
  type PublicSocialSyncResult,
  SocialSyncError,
  TIKHUB_TIMEOUT_MS,
  type TikHubFetch,
} from "./social-sync.ts";
import {
  type ClaimedSocialSyncJob,
  createSocialSyncHandler,
  type PersistSocialSyncResultInput,
  runSocialSyncJobs,
  type SocialConnectionRecord,
  type SocialSyncRepository,
  type SocialSyncRunResult,
} from "./social-sync-worker.ts";

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

function envelope(requestId: string, data: unknown): Record<string, unknown> {
  return {
    code: 200,
    request_id: requestId,
    message: "Request successful. This request will incur a charge.",
    message_zh: "請求成功，本次請求將被計費。",
    support: "Discord: https://discord.gg/aMEAS8Xsvz",
    time: "2026-08-10 10:00:00",
    time_stamp: 1_786_355_200,
    time_zone: "America/Los_Angeles",
    docs: "https://api.tikhub.io",
    cache_message: "Cached for request tracing",
    cache_message_zh: "已快取供請求追蹤",
    cache_url: "https://api.tikhub.io/cache/fixture",
    router: "/fixture",
    params: {},
    data,
  };
}

const tiktokProfile = envelope("req-tiktok-profile", {
  user: {
    uid: "107955",
    sec_uid: "MS4wLjABAAAAtest",
    unique_id: "aigro_teacher",
    nickname: "AIGRO Teacher",
    signature: "AI growth lessons for Hong Kong",
    avatar_larger: { url_list: ["https://cdn.example/tiktok-avatar.jpg"] },
    secret: 0,
    verification_type: 1,
  },
  stats: {
    follower_count: 1200,
    following_count: 25,
    aweme_count: 31,
    total_favorited: 5200,
  },
});

const tiktokPosts = envelope("req-tiktok-posts", {
  aweme_list: [
    {
      aweme_id: "7520000000000000001",
      aweme_type: 0,
      desc: "每日一個 AI 增長技巧",
      create_time: 1_786_320_000,
      author: { unique_id: "aigro_teacher", sec_uid: "MS4wLjABAAAAtest" },
      video: {
        duration: 32_000,
        cover: { url_list: ["https://cdn.example/tiktok-cover.jpg"] },
      },
      statistics: {
        play_count: 900,
        digg_count: 80,
        comment_count: 12,
        share_count: 7,
        collect_count: 18,
      },
    },
  ],
  has_more: 1,
  max_cursor: 1_786_320_000_000,
  min_cursor: 0,
});

const instagramProfileData = {
  id: "17841400000000000",
  username: "aigro.teacher",
  full_name: "AIGRO Teacher",
  biography: "Practical AI growth lessons",
  external_url: "https://aigro.hk",
  profile_pic_url: "https://cdn.example/instagram-avatar.jpg",
  is_verified: true,
  is_private: false,
  follower_count: 2400,
  following_count: 50,
  media_count: 75,
  country: "HK",
  joined_at: "2024-01-01",
};
const instagramProfile = envelope(
  "req-instagram-profile",
  instagramProfileData,
);

const instagramPosts = envelope("req-instagram-posts", {
  items: [
    {
      id: "36000000000000001",
      pk: "36000000000000001",
      code: "DMvpFixture",
      media_type: 2,
      product_type: "clips",
      taken_at: 1_786_320_000,
      caption: { text: "三步建立你嘅 AI 工作流" },
      image_versions2: {
        candidates: [{
          url: "https://cdn.example/instagram-cover.jpg",
          width: 1080,
          height: 1920,
        }],
      },
      video_duration: 28.5,
      like_count: 130,
      comment_count: 15,
      play_count: 1800,
      view_count: 1750,
      user: { id: "17841400000000000", username: "aigro.teacher" },
    },
  ],
  pagination_token: "next-instagram-page",
});

function jsonResponse(
  payload: unknown,
  status = 200,
  headers?: HeadersInit,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function publicConnection(
  platform: "tiktok" | "instagram" = "tiktok",
): PublicSocialConnection {
  return {
    id: `connection-${platform}`,
    platform,
    source: "tikhub_public",
    accountIdentifier: platform === "tiktok"
      ? "@aigro_teacher"
      : "aigro.teacher",
    providerAccountId: null,
    consentStatus: "active",
    syncEnabled: true,
  };
}

async function runFixtureSync(
  platform: "tiktok" | "instagram",
  profilePayload: unknown,
  postsPayload: unknown,
): Promise<{
  calls: number;
  code: string;
  result: PublicSocialSyncResult | null;
}> {
  let calls = 0;
  const provider = createTikHubPublicProvider({
    apiKey: "test-key",
    fetcher: () => {
      calls += 1;
      return Promise.resolve(
        jsonResponse(calls === 1 ? profilePayload : postsPayload),
      );
    },
  });
  try {
    const result = await provider.sync(publicConnection(platform));
    return {
      calls,
      code: "",
      result,
    };
  } catch (error) {
    return {
      calls,
      code: error instanceof SocialSyncError ? error.code : "unexpected",
      result: null,
    };
  }
}

Deno.test("TikHub TikTok adapter uses current first-page endpoints and normalizes minimal public data", async () => {
  const calls: Array<{ url: URL; authorization: string | null }> = [];
  const fetcher: TikHubFetch = (input, init) => {
    const url = new URL(String(input));
    calls.push({
      url,
      authorization: new Headers(init?.headers).get("authorization"),
    });
    return Promise.resolve(
      jsonResponse(calls.length === 1 ? tiktokProfile : tiktokPosts),
    );
  };
  const provider = createTikHubPublicProvider({ apiKey: "test-key", fetcher });

  const result = await provider.sync(publicConnection("tiktok"));

  assert(
    calls.length === 2,
    "TikTok sync must make one profile and one posts request",
  );
  assert(
    calls[0].url.pathname === "/api/v1/tiktok/app/v3/handler_user_profile",
    "TikTok profile endpoint must match current OpenAPI",
  );
  assert(
    calls[1].url.pathname === "/api/v1/tiktok/app/v3/fetch_user_post_videos_v3",
    "TikTok posts endpoint must match current OpenAPI",
  );
  assert(
    calls[1].url.searchParams.get("max_cursor") === "0",
    "TikTok sync must fetch the first page",
  );
  assert(
    calls[1].url.searchParams.get("count") === "20",
    "TikTok page size must stay at 20",
  );
  assert(
    calls[1].url.searchParams.get("sort_type") === "0",
    "TikTok posts must be newest first",
  );
  assert(
    calls.every((call) => call.authorization === "Bearer test-key"),
    "API key must stay in bearer header",
  );
  assert(
    calls.every((call) => !call.url.href.includes("test-key")),
    "API key must never enter the URL",
  );
  assert(
    result.profile.providerAccountId === "MS4wLjABAAAAtest",
    "TikTok stable account ID must normalize",
  );
  assert(
    result.profile.canonicalUrl === "https://www.tiktok.com/@aigro_teacher",
    "canonical profile URL must normalize",
  );
  assert(result.items.length === 1, "one TikTok item must normalize");
  assert(
    result.items[0].providerContentId === "7520000000000000001",
    "TikTok video ID must normalize",
  );
  assert(
    result.items[0].textContent === "每日一個 AI 增長技巧",
    "TikTok caption must normalize",
  );
  assert(
    result.items[0].publicMetrics.views === 900,
    "TikTok public view count must normalize",
  );
  assert(
    result.requestId === "req-tiktok-posts",
    "posts request ID must be retained for tracing",
  );
});

Deno.test("TikHub Instagram adapter uses current first-page endpoints and normalizes minimal public data", async () => {
  const calls: URL[] = [];
  const fetcher: TikHubFetch = (input) => {
    calls.push(new URL(String(input)));
    return Promise.resolve(
      jsonResponse(calls.length === 1 ? instagramProfile : instagramPosts),
    );
  };
  const provider = createTikHubPublicProvider({ apiKey: "test-key", fetcher });

  const result = await provider.sync(publicConnection("instagram"));

  assert(
    calls[0].pathname === "/api/v1/instagram/v2/fetch_user_info",
    "Instagram profile endpoint must match OpenAPI",
  );
  assert(
    calls[1].pathname === "/api/v1/instagram/v2/fetch_user_posts",
    "Instagram posts endpoint must match OpenAPI",
  );
  assert(
    !calls[1].searchParams.has("pagination_token"),
    "daily Instagram sync must fetch only the first page",
  );
  assert(
    result.profile.providerAccountId === "17841400000000000",
    "Instagram account ID must normalize",
  );
  assert(
    result.items[0].contentType === "reel",
    "Instagram clip must normalize as a reel",
  );
  assert(
    result.items[0].canonicalUrl === "https://www.instagram.com/p/DMvpFixture/",
    "Instagram post URL must normalize",
  );
  assert(
    result.items[0].publicMetrics.likes === 130,
    "Instagram public likes must normalize",
  );
  assert(
    result.cursor === "next-instagram-page",
    "Instagram cursor must be retained without following it",
  );
});

Deno.test("public adapter rejects YouTube, non-public sources and credential-shaped input", () => {
  const unsafeConnections: unknown[] = [
    { ...publicConnection(), platform: "youtube" },
    { ...publicConnection(), source: "official_oauth" },
    { ...publicConnection(), cookie: "sessionid=secret" },
    {
      ...publicConnection(),
      accountIdentifier: "https://user:password@www.tiktok.com/@teacher",
    },
  ];
  const expectedCodes = [
    "youtube_requires_official_oauth",
    "unsupported_connection_source",
    "credentials_not_allowed",
    "credentials_not_allowed",
  ];
  unsafeConnections.forEach((connection, index) => {
    let code = "";
    try {
      assertSafePublicConnection(connection);
    } catch (error) {
      code = error instanceof SocialSyncError ? error.code : "unexpected";
    }
    assert(
      code === expectedCodes[index],
      `unexpected safety error for case ${index}: ${code}`,
    );
  });
});

Deno.test("private profile is rejected before its posts are requested", async () => {
  let calls = 0;
  const fetcher: TikHubFetch = () => {
    calls += 1;
    return Promise.resolve(jsonResponse(envelope("req-private", {
      ...instagramProfileData,
      is_private: true,
    })));
  };
  const provider = createTikHubPublicProvider({ apiKey: "test-key", fetcher });
  let code = "";
  try {
    await provider.sync(publicConnection("instagram"));
  } catch (error) {
    code = error instanceof SocialSyncError ? error.code : "unexpected";
  }
  assert(
    code === "private_account_not_supported",
    `unexpected private-account error: ${code}`,
  );
  assert(calls === 1, "private profile must stop before the posts request");
});

Deno.test("profiles require an explicit recognized public privacy value", async () => {
  const tiktokUser = {
    ...((tiktokProfile.data as Record<string, unknown>).user as Record<
      string,
      unknown
    >),
  };
  delete tiktokUser.secret;
  const instagramUser = { ...instagramProfileData } as Record<string, unknown>;
  delete instagramUser.is_private;
  const cases: Array<{
    name: string;
    platform: "tiktok" | "instagram";
    profile: unknown;
    expectedCode: string;
  }> = [
    {
      name: "TikTok missing",
      platform: "tiktok",
      profile: envelope("req-tiktok-privacy-missing", {
        ...(tiktokProfile.data as Record<string, unknown>),
        user: tiktokUser,
      }),
      expectedCode: "provider_privacy_state_unknown",
    },
    {
      name: "TikTok unknown",
      platform: "tiktok",
      profile: envelope("req-tiktok-privacy-unknown", {
        ...(tiktokProfile.data as Record<string, unknown>),
        user: { ...tiktokUser, secret: "unknown" },
      }),
      expectedCode: "provider_privacy_state_unknown",
    },
    {
      name: "TikTok private",
      platform: "tiktok",
      profile: envelope("req-tiktok-private", {
        ...(tiktokProfile.data as Record<string, unknown>),
        user: { ...tiktokUser, secret: 1 },
      }),
      expectedCode: "private_account_not_supported",
    },
    {
      name: "Instagram missing",
      platform: "instagram",
      profile: envelope("req-instagram-privacy-missing", instagramUser),
      expectedCode: "provider_privacy_state_unknown",
    },
    {
      name: "Instagram unknown",
      platform: "instagram",
      profile: envelope("req-instagram-privacy-unknown", {
        ...instagramUser,
        is_private: "unknown",
      }),
      expectedCode: "provider_privacy_state_unknown",
    },
    {
      name: "Instagram private",
      platform: "instagram",
      profile: envelope("req-instagram-private", {
        ...instagramUser,
        is_private: true,
      }),
      expectedCode: "private_account_not_supported",
    },
  ];

  for (const testCase of cases) {
    const outcome = await runFixtureSync(
      testCase.platform,
      testCase.profile,
      testCase.platform === "tiktok" ? tiktokPosts : instagramPosts,
    );
    assert(
      outcome.code === testCase.expectedCode,
      `${testCase.name}: expected ${testCase.expectedCode}, got ${outcome.code}`,
    );
    assert(
      outcome.calls === 1,
      `${testCase.name}: rejected privacy must stop before posts`,
    );
  }
});

Deno.test("recognized string public privacy values remain accepted", async () => {
  const tiktokUser = (tiktokProfile.data as Record<string, unknown>)
    .user as Record<
      string,
      unknown
    >;
  const cases: Array<{
    platform: "tiktok" | "instagram";
    profile: unknown;
    posts: unknown;
  }> = [
    {
      platform: "tiktok",
      profile: envelope("req-tiktok-public-string", {
        ...(tiktokProfile.data as Record<string, unknown>),
        user: { ...tiktokUser, secret: "0" },
      }),
      posts: tiktokPosts,
    },
    {
      platform: "instagram",
      profile: envelope("req-instagram-public-string", {
        ...instagramProfileData,
        is_private: "false",
      }),
      posts: instagramPosts,
    },
  ];

  for (const testCase of cases) {
    const outcome = await runFixtureSync(
      testCase.platform,
      testCase.profile,
      testCase.posts,
    );
    assert(
      outcome.code === "" && outcome.result?.items.length === 1,
      `${testCase.platform}: explicit public privacy must be accepted`,
    );
  }
});

Deno.test("provider profile must match the account covered by consent", async () => {
  let calls = 0;
  const mismatchedProfile = envelope("req-wrong-profile", {
    ...(tiktokProfile.data as Record<string, unknown>),
    user: {
      ...((tiktokProfile.data as Record<string, unknown>).user as Record<
        string,
        unknown
      >),
      unique_id: "another_teacher",
    },
  });
  const provider = createTikHubPublicProvider({
    apiKey: "test-key",
    fetcher: () => {
      calls += 1;
      return Promise.resolve(jsonResponse(mismatchedProfile));
    },
  });
  let code = "";
  try {
    await provider.sync(publicConnection("tiktok"));
  } catch (error) {
    code = error instanceof SocialSyncError ? error.code : "unexpected";
  }
  assert(
    code === "provider_identity_mismatch",
    `unexpected identity error: ${code}`,
  );
  assert(calls === 1, "identity mismatch must stop before fetching posts");
});

Deno.test("provider posts must belong to the consented profile", async () => {
  let calls = 0;
  const mismatchedPosts = envelope("req-wrong-author", {
    ...(tiktokPosts.data as Record<string, unknown>),
    aweme_list: [
      {
        ...(((tiktokPosts.data as Record<string, unknown>).aweme_list as Array<
          Record<string, unknown>
        >)[0]),
        author: { unique_id: "another_teacher", sec_uid: "another-id" },
      },
    ],
  });
  const provider = createTikHubPublicProvider({
    apiKey: "test-key",
    fetcher: () => {
      calls += 1;
      return Promise.resolve(
        jsonResponse(calls === 1 ? tiktokProfile : mismatchedPosts),
      );
    },
  });
  let code = "";
  try {
    await provider.sync(publicConnection("tiktok"));
  } catch (error) {
    code = error instanceof SocialSyncError ? error.code : "unexpected";
  }
  assert(
    code === "provider_content_identity_mismatch",
    `unexpected post-author error: ${code}`,
  );
});

Deno.test("provider posts require an author identity on every item", async () => {
  const tiktokItem =
    ((tiktokPosts.data as Record<string, unknown>).aweme_list as Array<
      Record<string, unknown>
    >)[0];
  const instagramItem =
    ((instagramPosts.data as Record<string, unknown>).items as Array<
      Record<string, unknown>
    >)[0];
  const cases: Array<{
    name: string;
    platform: "tiktok" | "instagram";
    profile: unknown;
    posts: unknown;
  }> = [
    {
      name: "TikTok",
      platform: "tiktok",
      profile: tiktokProfile,
      posts: envelope("req-tiktok-author-missing", {
        ...(tiktokPosts.data as Record<string, unknown>),
        aweme_list: [{ ...tiktokItem, author: undefined }],
      }),
    },
    {
      name: "Instagram",
      platform: "instagram",
      profile: instagramProfile,
      posts: envelope("req-instagram-author-missing", {
        ...(instagramPosts.data as Record<string, unknown>),
        items: [{ ...instagramItem, user: undefined, owner: undefined }],
      }),
    },
  ];

  for (const testCase of cases) {
    const outcome = await runFixtureSync(
      testCase.platform,
      testCase.profile,
      testCase.posts,
    );
    assert(
      outcome.code === "provider_content_identity_missing",
      `${testCase.name}: missing author identity must reject, got ${outcome.code}`,
    );
  }
});

Deno.test("every present post author identifier must match the profile", async () => {
  const tiktokItem =
    ((tiktokPosts.data as Record<string, unknown>).aweme_list as Array<
      Record<string, unknown>
    >)[0];
  const instagramItem =
    ((instagramPosts.data as Record<string, unknown>).items as Array<
      Record<string, unknown>
    >)[0];
  const cases: Array<{
    name: string;
    platform: "tiktok" | "instagram";
    profile: unknown;
    posts: unknown;
  }> = [
    {
      name: "TikTok conflicting ID with matching handle",
      platform: "tiktok",
      profile: tiktokProfile,
      posts: envelope("req-tiktok-author-id-conflict", {
        ...(tiktokPosts.data as Record<string, unknown>),
        aweme_list: [{
          ...tiktokItem,
          author: { unique_id: "aigro_teacher", sec_uid: "another-id" },
        }],
      }),
    },
    {
      name: "TikTok conflicting handle with matching ID",
      platform: "tiktok",
      profile: tiktokProfile,
      posts: envelope("req-tiktok-author-handle-conflict", {
        ...(tiktokPosts.data as Record<string, unknown>),
        aweme_list: [{
          ...tiktokItem,
          author: {
            unique_id: "another_teacher",
            sec_uid: "MS4wLjABAAAAtest",
          },
        }],
      }),
    },
    {
      name: "Instagram conflicting ID with matching handle",
      platform: "instagram",
      profile: instagramProfile,
      posts: envelope("req-instagram-author-id-conflict", {
        ...(instagramPosts.data as Record<string, unknown>),
        items: [{
          ...instagramItem,
          user: { id: "another-id", username: "aigro.teacher" },
        }],
      }),
    },
    {
      name: "Instagram conflicting handle with matching ID",
      platform: "instagram",
      profile: instagramProfile,
      posts: envelope("req-instagram-author-handle-conflict", {
        ...(instagramPosts.data as Record<string, unknown>),
        items: [{
          ...instagramItem,
          user: {
            id: "17841400000000000",
            username: "another.teacher",
          },
        }],
      }),
    },
  ];

  for (const testCase of cases) {
    const outcome = await runFixtureSync(
      testCase.platform,
      testCase.profile,
      testCase.posts,
    );
    assert(
      outcome.code === "provider_content_identity_mismatch",
      `${testCase.name}: every present identifier must match, got ${outcome.code}`,
    );
  }
});

Deno.test("one matching post author identifier is sufficient when the other is absent", async () => {
  const tiktokItem =
    ((tiktokPosts.data as Record<string, unknown>).aweme_list as Array<
      Record<string, unknown>
    >)[0];
  const instagramItem =
    ((instagramPosts.data as Record<string, unknown>).items as Array<
      Record<string, unknown>
    >)[0];
  const cases: Array<{
    name: string;
    platform: "tiktok" | "instagram";
    profile: unknown;
    posts: unknown;
  }> = [
    {
      name: "TikTok stable ID only",
      platform: "tiktok",
      profile: tiktokProfile,
      posts: envelope("req-tiktok-author-id-only", {
        ...(tiktokPosts.data as Record<string, unknown>),
        aweme_list: [{
          ...tiktokItem,
          author: { sec_uid: "MS4wLjABAAAAtest" },
        }],
      }),
    },
    {
      name: "TikTok handle only",
      platform: "tiktok",
      profile: tiktokProfile,
      posts: envelope("req-tiktok-author-handle-only", {
        ...(tiktokPosts.data as Record<string, unknown>),
        aweme_list: [{
          ...tiktokItem,
          author: { unique_id: "AIGRO_TEACHER" },
        }],
      }),
    },
    {
      name: "Instagram stable ID only",
      platform: "instagram",
      profile: instagramProfile,
      posts: envelope("req-instagram-author-id-only", {
        ...(instagramPosts.data as Record<string, unknown>),
        items: [{
          ...instagramItem,
          user: { id: "17841400000000000" },
        }],
      }),
    },
    {
      name: "Instagram handle only",
      platform: "instagram",
      profile: instagramProfile,
      posts: envelope("req-instagram-author-handle-only", {
        ...(instagramPosts.data as Record<string, unknown>),
        items: [{
          ...instagramItem,
          user: { username: "AIGRO.TEACHER" },
        }],
      }),
    },
  ];

  for (const testCase of cases) {
    const outcome = await runFixtureSync(
      testCase.platform,
      testCase.profile,
      testCase.posts,
    );
    assert(
      outcome.code === "" && outcome.result?.items.length === 1,
      `${testCase.name}: one matching identifier should be accepted`,
    );
  }
});

Deno.test("provider response is defensively capped to the documented first page", async () => {
  let calls = 0;
  const oversizedPosts = envelope("req-tiktok-oversized", {
    ...(tiktokPosts.data as Record<string, unknown>),
    aweme_list: Array.from({ length: 25 }, (_, index) => ({
      ...((tiktokPosts.data as Record<string, unknown>).aweme_list as Array<
        Record<string, unknown>
      >)[0],
      aweme_id: `75200000000000000${String(index).padStart(2, "0")}`,
    })),
  });
  const provider = createTikHubPublicProvider({
    apiKey: "test-key",
    fetcher: () => {
      calls += 1;
      return Promise.resolve(
        jsonResponse(calls === 1 ? tiktokProfile : oversizedPosts),
      );
    },
  });

  const result = await provider.sync(publicConnection("tiktok"));

  assert(
    result.items.length === 20,
    `expected a hard cap of 20 items, got ${result.items.length}`,
  );
});

Deno.test("429 retry honors Retry-After before continuing", async () => {
  let fetchCount = 0;
  const sleeps: number[] = [];
  const fetcher: TikHubFetch = () => {
    fetchCount += 1;
    if (fetchCount === 1) {
      return Promise.resolve(
        jsonResponse({ code: 429 }, 429, { "retry-after": "2" }),
      );
    }
    return Promise.resolve(
      jsonResponse(fetchCount === 2 ? tiktokProfile : tiktokPosts),
    );
  };
  const provider = createTikHubPublicProvider({
    apiKey: "test-key",
    fetcher,
    sleep: (milliseconds) => {
      sleeps.push(milliseconds);
      return Promise.resolve();
    },
  });

  await provider.sync(publicConnection("tiktok"));

  assertEquals(sleeps, [2_000], "Retry-After seconds must control retry delay");
  assert(fetchCount === 3, "one profile retry plus posts request expected");
});

Deno.test("invocation abort cancels provider backoff without another request", async () => {
  let fetchCount = 0;
  let enteredBackoff: (() => void) | undefined;
  const backoffStarted = new Promise<void>((resolve) => {
    enteredBackoff = resolve;
  });
  const provider = createTikHubPublicProvider({
    apiKey: "test-key",
    fetcher: () => {
      fetchCount += 1;
      return Promise.resolve(
        jsonResponse({ code: 429 }, 429, { "retry-after": "2" }),
      );
    },
    sleep: () => {
      enteredBackoff?.();
      return new Promise<void>(() => {});
    },
  });
  const deadline = new AbortController();
  const pending = provider.sync(publicConnection("tiktok"), {
    signal: deadline.signal,
  });
  await backoffStarted;
  deadline.abort();

  let caught: unknown;
  try {
    await pending;
  } catch (error) {
    caught = error;
  }
  assert(
    caught instanceof SocialSyncError &&
      caught.code === "invocation_deadline_exceeded",
    "abort must become the safe retryable invocation deadline error",
  );
  assert(fetchCount === 1, "aborted backoff must not issue another request");
});

Deno.test("non-retryable provider errors stop after one request and do not expose payloads", async () => {
  let fetchCount = 0;
  const fetcher: TikHubFetch = () => {
    fetchCount += 1;
    return Promise.resolve(jsonResponse({ secret: "must-not-leak" }, 401));
  };
  const provider = createTikHubPublicProvider({ apiKey: "test-key", fetcher });
  let caught: unknown;
  try {
    await provider.sync(publicConnection("tiktok"));
  } catch (error) {
    caught = error;
  }
  assert(
    caught instanceof SocialSyncError,
    "provider failure must be a typed safe error",
  );
  assert(
    caught.code === "provider_http_401",
    `unexpected provider code: ${caught.code}`,
  );
  assert(
    !caught.message.includes("must-not-leak"),
    "raw provider payload must not enter errors",
  );
  assert(fetchCount === 1, "401 must not be retried");
  assert(
    TIKHUB_TIMEOUT_MS === 30_000,
    "provider request timeout must stay at 30 seconds",
  );
});

function job(id: string, connectionId: string): ClaimedSocialSyncJob {
  return { id, connectionId, expertId: "expert-1", attempts: 1 };
}

function connectionRecord(id: string): SocialConnectionRecord {
  return {
    id,
    expertId: "expert-1",
    platform: "tiktok",
    source: "tikhub_public",
    accountIdentifier: "aigro_teacher",
    providerAccountId: null,
    canonicalUrl: null,
    consentStatus: "active",
    syncEnabled: true,
    useForDistillation: true,
  };
}

Deno.test("worker holds the distributed invocation lease and claims only one job", async () => {
  const claimed = [
    job("job-1", "connection-1"),
    job("job-2", "connection-2"),
    job("job-3", "connection-3"),
    job("job-4", "connection-4"),
  ];
  const persisted: PersistSocialSyncResultInput[] = [];
  const finished: Array<{ jobId: string; success: boolean }> = [];
  let claimedLimit = 0;
  let leaseOwner: string | null = null;
  let leaseHeldAtClaim = false;
  let released = 0;
  let active = 0;
  let maximumActive = 0;
  const repository = {
    acquireInvocationLease: (workerId: string) => {
      if (leaseOwner) return Promise.resolve(false);
      leaseOwner = workerId;
      return Promise.resolve(true);
    },
    releaseInvocationLease: (workerId: string) => {
      if (leaseOwner === workerId) leaseOwner = null;
      released += 1;
      return Promise.resolve();
    },
    claimJobs: (_workerId: string, limit: number) => {
      claimedLimit = limit;
      leaseHeldAtClaim = leaseOwner === "worker-1";
      return Promise.resolve(claimed);
    },
    getConnection: (id: string) => Promise.resolve(connectionRecord(id)),
    persistResult: (input: PersistSocialSyncResultInput) => {
      persisted.push(input);
      return Promise.resolve(input.items.length);
    },
    finishJob: (input: Parameters<SocialSyncRepository["finishJob"]>[0]) => {
      finished.push({ jobId: input.jobId, success: input.success });
      return Promise.resolve();
    },
  };
  const provider = {
    async sync(connection: PublicSocialConnection) {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
      return {
        profile: {
          provider: "tiktok" as const,
          providerAccountId: "MS4wLjABAAAAtest",
          handle: "aigro_teacher",
          displayName: "AIGRO Teacher",
          canonicalUrl: "https://www.tiktok.com/@aigro_teacher",
          bio: "AI growth",
          avatarUrl: null,
          verified: false,
          private: false,
          publicMetrics: {},
        },
        items: [{
          provider: "tiktok" as const,
          providerContentId: `post-${connection.id}`,
          canonicalUrl:
            `https://www.tiktok.com/@aigro_teacher/video/post-${connection.id}`,
          contentType: "video",
          title: null,
          textContent: "一段足夠長度用作知識蒸餾嘅公開內容",
          thumbnailUrl: null,
          publishedAt: "2026-08-10T00:00:00.000Z",
          publicMetrics: { views: 10 },
        }],
        requestId: `request-${connection.id}`,
        cursor: "next",
        endpoint: "/api/v1/tiktok/app/v3/fetch_user_post_videos_v3",
      };
    },
  };

  const result = await runSocialSyncJobs({
    repository,
    provider,
    workerId: "worker-1",
  });

  assert(
    leaseHeldAtClaim,
    "worker must hold the database lease before claiming",
  );
  assert(
    claimedLimit === 1,
    "worker must request exactly one job per invocation",
  );
  assert(
    result.claimed === 1,
    "worker must defensively cap an oversized claim result to one",
  );
  assert(
    maximumActive === 1,
    "social sync jobs must run with global concurrency one",
  );
  assert(
    persisted.length === 1 && persisted[0].items.length === 1,
    "the one claimed job must atomically persist its consent-checked result",
  );
  assert(
    finished.length === 0,
    "successful jobs must complete inside the atomic persistence transaction",
  );
  assert(
    released === 1 && leaseOwner === null,
    "worker must release its invocation lease",
  );
});

Deno.test("worker does not claim when another invocation holds the singleton lease", async () => {
  let claims = 0;
  const repository = {
    acquireInvocationLease: () => Promise.resolve(false),
    releaseInvocationLease: () => Promise.resolve(),
    claimJobs: () => {
      claims += 1;
      return Promise.resolve([job("job-1", "connection-1")]);
    },
    getConnection: () => Promise.resolve(connectionRecord("connection-1")),
    persistResult: () => Promise.resolve(0),
    finishJob: () => Promise.resolve(),
  };

  const result = await runSocialSyncJobs({
    repository,
    provider: { sync: () => Promise.reject(new Error("must not run")) },
    workerId: "worker-2",
  });

  assert(claims === 0, "lease-busy invocation must not claim a job");
  assert(
    result.claimed === 0,
    "lease-busy invocation must report no claimed job",
  );
  assert(
    (result as SocialSyncRunResult & { skipped?: string }).skipped ===
      "lease_busy",
    "lease contention must be observable",
  );
});

Deno.test("worker aborts at the overall deadline and durably retries the claimed job", async () => {
  let finishInput: Parameters<SocialSyncRepository["finishJob"]>[0] | undefined;
  let persisted = 0;
  let released = 0;
  const repository = {
    acquireInvocationLease: () => Promise.resolve(true),
    releaseInvocationLease: () => {
      released += 1;
      return Promise.resolve();
    },
    claimJobs: () => Promise.resolve([job("job-1", "connection-1")]),
    getConnection: () => Promise.resolve(connectionRecord("connection-1")),
    persistResult: () => {
      persisted += 1;
      return Promise.resolve(0);
    },
    finishJob: (input: Parameters<SocialSyncRepository["finishJob"]>[0]) => {
      finishInput = input;
      return Promise.resolve();
    },
  };
  const provider = {
    sync: (
      _connection: PublicSocialConnection,
      context?: { signal?: AbortSignal },
    ) =>
      new Promise<PublicSocialSyncResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve({
            profile: {
              provider: "tiktok",
              providerAccountId: "account-1",
              handle: "aigro_teacher",
              displayName: "AIGRO Teacher",
              canonicalUrl: "https://www.tiktok.com/@aigro_teacher",
              bio: null,
              avatarUrl: null,
              verified: false,
              private: false,
              publicMetrics: {},
            },
            items: [],
            requestId: "late-request",
            cursor: null,
            endpoint: "/api/v1/tiktok/app/v3/fetch_user_post_videos_v3",
          });
        }, 25);
        context?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(
            new SocialSyncError("invocation_deadline_exceeded", {
              retryable: true,
            }),
          );
        }, { once: true });
      }),
  };
  const runOptions = {
    repository,
    provider,
    workerId: "worker-deadline",
    deadlineMs: 5,
  };

  const result = await runSocialSyncJobs(runOptions);

  assert(
    persisted === 0,
    "deadline-expired provider result must never persist",
  );
  assert(
    finishInput?.errorMessage === "invocation_deadline_exceeded",
    "deadline expiry must become a safe durable retry",
  );
  assert(
    result.results[0].status === "retry",
    "deadline expiry must be retryable",
  );
  assert(released === 1, "deadline path must release its invocation lease");
});

Deno.test("worker reports a safe failure without storing provider payloads", async () => {
  let finishInput: Parameters<SocialSyncRepository["finishJob"]>[0] | undefined;
  const repository: SocialSyncRepository = {
    acquireInvocationLease: () => Promise.resolve(true),
    releaseInvocationLease: () => Promise.resolve(),
    claimJobs: () => Promise.resolve([job("job-1", "connection-1")]),
    getConnection: () => Promise.resolve(connectionRecord("connection-1")),
    persistResult: () => Promise.resolve(0),
    finishJob: (input) => {
      finishInput = input;
      return Promise.resolve();
    },
  };
  const provider = {
    sync: () =>
      Promise.reject(
        new SocialSyncError("provider_invalid_response", {
          message: "provider_invalid_response",
          requestId: "request-safe",
          retryable: true,
        }),
      ),
  };

  const result = await runSocialSyncJobs({
    repository,
    provider,
    workerId: "worker-1",
  });

  assert(
    result.results[0].status === "retry",
    "attempt one failure should be reported as retry",
  );
  assert(
    finishInput?.success === false,
    "failed job must call finish RPC as unsuccessful",
  );
  assert(
    finishInput?.errorMessage === "provider_invalid_response",
    "only safe error code may be persisted",
  );
  assert(
    finishInput?.providerRequestId === "request-safe",
    "safe provider request ID must be persisted",
  );
});

Deno.test("worker marks non-retryable provider failures terminal immediately", async () => {
  let finishInput: Parameters<SocialSyncRepository["finishJob"]>[0] | undefined;
  const repository: SocialSyncRepository = {
    acquireInvocationLease: () => Promise.resolve(true),
    releaseInvocationLease: () => Promise.resolve(),
    claimJobs: () => Promise.resolve([job("job-1", "connection-1")]),
    getConnection: () => Promise.resolve(connectionRecord("connection-1")),
    persistResult: () => Promise.resolve(0),
    finishJob: (input) => {
      finishInput = input;
      return Promise.resolve();
    },
  };
  const provider = {
    sync: () =>
      Promise.reject(new SocialSyncError("private_account_not_supported")),
  };

  const result = await runSocialSyncJobs({
    repository,
    provider,
    workerId: "worker-1",
  });

  assert(
    result.results[0].status === "failed",
    "non-retryable failure must be terminal",
  );
  assert(
    finishInput?.retryable === false,
    "terminal intent must reach the database RPC",
  );
});

Deno.test("worker handler rejects non-POST requests before running jobs", async () => {
  let ran = false;
  const handler = createSocialSyncHandler({
    expectedSecret: () => "worker-secret",
    run: () => {
      ran = true;
      return Promise.resolve({ claimed: 0, results: [] });
    },
  });
  const response = await handler(
    new Request("https://example.test", { method: "GET" }),
  );
  assert(response.status === 405, `expected 405, got ${response.status}`);
  assert(!ran, "non-POST request must not run jobs");
});

Deno.test("worker handler requires the configured custom secret", async () => {
  let ran = false;
  const handler = createSocialSyncHandler({
    expectedSecret: () => "worker-secret",
    run: () => {
      ran = true;
      return Promise.resolve({ claimed: 0, results: [] });
    },
  });
  const response = await handler(
    new Request("https://example.test", {
      method: "POST",
      headers: { "x-worker-secret": "wrong" },
    }),
  );
  assert(response.status === 401, `expected 401, got ${response.status}`);
  assert(!ran, "unauthorized request must not run jobs");
});

Deno.test("worker handler reports missing server configuration without claiming jobs", async () => {
  let ran = false;
  const handler = createSocialSyncHandler({
    expectedSecret: () => undefined,
    run: () => {
      ran = true;
      return Promise.resolve({ claimed: 0, results: [] });
    },
  });
  const response = await handler(
    new Request("https://example.test", { method: "POST" }),
  );
  assert(response.status === 503, `expected 503, got ${response.status}`);
  assert(!ran, "misconfigured worker must not claim jobs");
});

Deno.test("authorized worker fails closed when background runtime is unavailable", async () => {
  let ran = false;
  const handler = createSocialSyncHandler({
    expectedSecret: () => "worker-secret",
    run: () => {
      ran = true;
      return Promise.resolve({ claimed: 0, results: [] });
    },
  });
  const response = await handler(
    new Request("https://example.test", {
      method: "POST",
      headers: { "x-worker-secret": "worker-secret" },
    }),
  );
  assert(response.status === 503, `expected 503, got ${response.status}`);
  assert(
    !ran,
    "missing waitUntil must not start work that the runtime may drop",
  );
});

Deno.test("worker does not start when background scheduling fails", async () => {
  let ran = false;
  const handler = createSocialSyncHandler({
    expectedSecret: () => "worker-secret",
    run: () => {
      ran = true;
      return Promise.resolve({ claimed: 0, results: [] });
    },
    waitUntil: () => {
      throw new Error("runtime rejected background task");
    },
  });
  const response = handler(
    new Request("https://example.test", {
      method: "POST",
      headers: { "x-worker-secret": "worker-secret" },
    }),
  );
  await Promise.resolve();
  assert(response.status === 503, `expected 503, got ${response.status}`);
  assert(!ran, "rejected background scheduling must not claim jobs");
});

Deno.test("authorized worker handler returns 202 before background work completes", async () => {
  let scheduled: Promise<unknown> | null = null;
  const neverCompletes = new Promise<SocialSyncRunResult>(() => {});
  const handlerOptions = {
    expectedSecret: () => "worker-secret",
    run: () => neverCompletes,
    waitUntil: (promise: Promise<unknown>) => {
      scheduled = promise;
    },
  };
  const handler = createSocialSyncHandler(handlerOptions);
  let timeout: number | undefined;
  const response = await Promise.race([
    handler(
      new Request("https://example.test", {
        method: "POST",
        headers: { "x-worker-secret": "worker-secret" },
      }),
    ),
    new Promise<null>((resolve) => {
      timeout = setTimeout(() => resolve(null), 20);
    }),
  ]);
  clearTimeout(timeout);
  assert(
    response instanceof Response,
    "handler must not await background work",
  );
  assert(response.status === 202, `expected 202, got ${response.status}`);
  assertEquals(await response.json(), {
    accepted: true,
  }, "authorized worker must acknowledge accepted background work");
  assert(scheduled !== null, "handler must hand work to EdgeRuntime.waitUntil");
});
