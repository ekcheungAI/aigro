export const TIKHUB_TIMEOUT_MS = 30_000;
export const TIKHUB_BASE_URL = "https://api.tikhub.io";

const MAX_PROVIDER_ATTEMPTS = 3;
const MAX_INLINE_RETRY_AFTER_MS = 10_000;
const TIKTOK_PROFILE_PATH = "/api/v1/tiktok/app/v3/handler_user_profile";
const TIKTOK_POSTS_PATH = "/api/v1/tiktok/app/v3/fetch_user_post_videos_v3";
const INSTAGRAM_PROFILE_PATH = "/api/v1/instagram/v2/fetch_user_info";
const INSTAGRAM_POSTS_PATH = "/api/v1/instagram/v2/fetch_user_posts";

export type SocialPlatform = "tiktok" | "instagram" | "youtube";

export interface PublicSocialConnection {
  id: string;
  platform: SocialPlatform;
  source: string;
  accountIdentifier: string;
  providerAccountId: string | null;
  consentStatus: string;
  syncEnabled: boolean;
}

export interface SafePublicSocialConnection extends PublicSocialConnection {
  platform: "tiktok" | "instagram";
  source: "tikhub_public";
  consentStatus: "active";
  syncEnabled: true;
}

export interface NormalizedSocialProfile {
  provider: "tiktok" | "instagram";
  providerAccountId: string;
  handle: string;
  displayName: string;
  canonicalUrl: string;
  bio: string | null;
  avatarUrl: string | null;
  verified: boolean;
  private: boolean;
  publicMetrics: Record<string, number>;
}

export interface NormalizedSocialContent {
  provider: "tiktok" | "instagram";
  providerContentId: string;
  canonicalUrl: string;
  contentType: string;
  title: string | null;
  textContent: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  publicMetrics: Record<string, number>;
}

export interface PublicSocialSyncResult {
  profile: NormalizedSocialProfile;
  items: NormalizedSocialContent[];
  requestId: string | null;
  cursor: string | null;
  endpoint: string;
}

export interface SocialSyncContext {
  signal?: AbortSignal;
}

export interface PublicSocialProvider {
  sync(
    connection: PublicSocialConnection,
    context?: SocialSyncContext,
  ): Promise<PublicSocialSyncResult>;
}

export type TikHubFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export class SocialSyncError extends Error {
  readonly code: string;
  readonly requestId: string | null;
  readonly retryable: boolean;

  constructor(
    code: string,
    options: {
      message?: string;
      requestId?: string | null;
      retryable?: boolean;
    } = {},
  ) {
    super(options.message ?? code);
    this.name = "SocialSyncError";
    this.code = code;
    this.requestId = options.requestId ?? null;
    this.retryable = options.retryable ?? false;
  }
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function stringValue(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function booleanValue(...values: unknown[]): boolean {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1" || value === "true") return true;
    if (value === 0 || value === "0" || value === "false") return false;
  }
  return false;
}

function explicitPrivacyValue(...values: unknown[]): boolean | null {
  let sawPublic = false;
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (value === true || value === 1 || value === "1" || value === "true") {
      return true;
    }
    if (
      value === false || value === 0 || value === "0" || value === "false"
    ) {
      sawPublic = true;
      continue;
    }
    return null;
  }
  return sawPublic ? false : null;
}

function assertContentAuthorIdentity(
  profile: NormalizedSocialProfile,
  authorId: string | null,
  authorHandle: string | null,
): void {
  if (!authorId && !authorHandle) {
    throw new SocialSyncError("provider_content_identity_missing");
  }
  if (authorId && authorId !== profile.providerAccountId) {
    throw new SocialSyncError("provider_content_identity_mismatch");
  }
  if (
    authorHandle &&
    authorHandle.toLowerCase() !== profile.handle.toLowerCase()
  ) {
    throw new SocialSyncError("provider_content_identity_mismatch");
  }
}

function imageUrl(value: unknown): string | null {
  if (typeof value === "string" && /^https:\/\//i.test(value)) return value;
  const object = record(value);
  if (!object) return null;
  const direct = stringValue(object.url);
  if (direct && /^https:\/\//i.test(direct)) return direct;
  const lists = [object.url_list, object.candidates];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const candidate of list) {
      const url = imageUrl(candidate);
      if (url) return url;
    }
  }
  return null;
}

function metrics(
  entries: Array<[string, number | null]>,
): Record<string, number> {
  const output: Record<string, number> = {};
  for (const [key, value] of entries) {
    if (value !== null && value >= 0) output[key] = value;
  }
  return output;
}

function epochIso(...values: unknown[]): string | null {
  const parsed = numberValue(...values);
  if (parsed === null || parsed <= 0) return null;
  const milliseconds = parsed < 10_000_000_000 ? parsed * 1_000 : parsed;
  const date = new Date(milliseconds);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function containsCredentialMaterial(
  value: unknown,
  seen = new Set<object>(),
): boolean {
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.some((item) => containsCredentialMaterial(item, seen));
  }
  for (const [key, item] of Object.entries(value as UnknownRecord)) {
    if (
      /^(?:cookie|cookies|password|passwd|session|sessionid|credential|credentials|access_?token|refresh_?token|proxy)$/i
        .test(key)
    ) {
      return true;
    }
    if (containsCredentialMaterial(item, seen)) return true;
  }
  return false;
}

function publicHandle(
  platform: "tiktok" | "instagram",
  rawIdentifier: string,
): string {
  const identifier = rawIdentifier.trim();
  if (!identifier) throw new SocialSyncError("invalid_account_identifier");
  let handle = identifier;
  if (/^https?:\/\//i.test(identifier)) {
    let url: URL;
    try {
      url = new URL(identifier);
    } catch {
      throw new SocialSyncError("invalid_account_identifier");
    }
    if (url.username || url.password) {
      throw new SocialSyncError("credentials_not_allowed");
    }
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(
      /^m\./,
      "",
    );
    if (host !== `${platform}.com`) {
      throw new SocialSyncError("invalid_account_identifier");
    }
    const segments = url.pathname.split("/").filter(Boolean);
    if (!segments.length) {
      throw new SocialSyncError("invalid_account_identifier");
    }
    if (platform === "tiktok") {
      if (!segments[0].startsWith("@")) {
        throw new SocialSyncError("invalid_account_identifier");
      }
      handle = segments[0].slice(1);
    } else {
      if (
        ["p", "reel", "reels", "stories", "explore"].includes(
          segments[0].toLowerCase(),
        )
      ) {
        throw new SocialSyncError("invalid_account_identifier");
      }
      handle = segments[0];
    }
  }
  handle = decodeURIComponent(handle).replace(/^@/, "").trim();
  if (!/^[A-Za-z0-9._-]{2,64}$/.test(handle)) {
    throw new SocialSyncError("invalid_account_identifier");
  }
  return handle;
}

export function assertSafePublicConnection(
  value: unknown,
): asserts value is SafePublicSocialConnection {
  const connection = record(value);
  if (!connection) throw new SocialSyncError("invalid_connection");
  if (connection.platform === "youtube") {
    throw new SocialSyncError("youtube_requires_official_oauth");
  }
  if (connection.platform !== "tiktok" && connection.platform !== "instagram") {
    throw new SocialSyncError("unsupported_social_platform");
  }
  if (connection.source !== "tikhub_public") {
    throw new SocialSyncError("unsupported_connection_source");
  }
  if (containsCredentialMaterial(connection)) {
    throw new SocialSyncError("credentials_not_allowed");
  }
  const accountIdentifier = stringValue(connection.accountIdentifier);
  if (!accountIdentifier) {
    throw new SocialSyncError("invalid_account_identifier");
  }
  if (/^https?:\/\//i.test(accountIdentifier)) {
    let url: URL;
    try {
      url = new URL(accountIdentifier);
    } catch {
      throw new SocialSyncError("invalid_account_identifier");
    }
    if (url.username || url.password) {
      throw new SocialSyncError("credentials_not_allowed");
    }
  }
  if (connection.consentStatus !== "active") {
    throw new SocialSyncError("social_consent_inactive");
  }
  if (connection.syncEnabled !== true) {
    throw new SocialSyncError("social_sync_disabled");
  }
}

interface TikHubEnvelope {
  data: unknown;
  requestId: string | null;
}

function retryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 ||
    status === 504;
}

function retryAfterMilliseconds(response: Response): number | null {
  const value = response.headers.get("retry-after")?.trim();
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1_000);
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, timestamp - Date.now());
}

function invocationDeadlineError(): SocialSyncError {
  return new SocialSyncError("invocation_deadline_exceeded", {
    retryable: true,
  });
}

function throwIfInvocationAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw invocationDeadlineError();
}

async function sleepWithSignal(
  sleep: (milliseconds: number) => Promise<void>,
  milliseconds: number,
  signal?: AbortSignal,
): Promise<void> {
  throwIfInvocationAborted(signal);
  if (!signal) {
    await sleep(milliseconds);
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(invocationDeadlineError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
    sleep(milliseconds).then(
      () => {
        signal.removeEventListener("abort", onAbort);
        if (signal.aborted) reject(invocationDeadlineError());
        else resolve();
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function requestAbortSignal(invocationSignal?: AbortSignal): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIKHUB_TIMEOUT_MS);
  const abortFromInvocation = () => controller.abort();
  if (invocationSignal?.aborted) abortFromInvocation();
  else {
    invocationSignal?.addEventListener("abort", abortFromInvocation, {
      once: true,
    });
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
      invocationSignal?.removeEventListener("abort", abortFromInvocation);
    },
  };
}

async function readRequestId(response: Response): Promise<string | null> {
  const payload = await response.json().catch(() => null);
  return stringValue(record(payload)?.request_id);
}

async function tikhubGet(
  path: string,
  query: Record<string, string | number>,
  options: {
    apiKey: string;
    fetcher: TikHubFetch;
    sleep: (milliseconds: number) => Promise<void>;
    signal?: AbortSignal;
  },
): Promise<TikHubEnvelope> {
  const url = new URL(path, TIKHUB_BASE_URL);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value));
  }

  for (let attempt = 1; attempt <= MAX_PROVIDER_ATTEMPTS; attempt += 1) {
    throwIfInvocationAborted(options.signal);
    let response: Response;
    const requestAbort = requestAbortSignal(options.signal);
    try {
      response = await options.fetcher(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${options.apiKey}`,
        },
        signal: requestAbort.signal,
      });
    } catch {
      requestAbort.cleanup();
      throwIfInvocationAborted(options.signal);
      if (attempt < MAX_PROVIDER_ATTEMPTS) {
        await sleepWithSignal(
          options.sleep,
          250 * 2 ** (attempt - 1),
          options.signal,
        );
        continue;
      }
      throw new SocialSyncError("provider_network_error", { retryable: true });
    }
    requestAbort.cleanup();
    throwIfInvocationAborted(options.signal);

    if (!response.ok) {
      const requestId = await readRequestId(response.clone());
      if (retryableStatus(response.status) && attempt < MAX_PROVIDER_ATTEMPTS) {
        const retryAfter = retryAfterMilliseconds(response);
        if (retryAfter === null || retryAfter <= MAX_INLINE_RETRY_AFTER_MS) {
          await sleepWithSignal(
            options.sleep,
            retryAfter ?? 250 * 2 ** (attempt - 1),
            options.signal,
          );
          continue;
        }
      }
      throw new SocialSyncError(`provider_http_${response.status}`, {
        requestId,
        retryable: retryableStatus(response.status),
      });
    }

    const payload = await response.json().catch(() => null);
    const root = record(payload);
    if (!root) {
      throw new SocialSyncError("provider_invalid_json", { retryable: true });
    }
    const requestId = stringValue(root.request_id);
    const responseCode = numberValue(root.code);
    if (responseCode !== null && responseCode !== 200) {
      const retryable = retryableStatus(responseCode);
      if (retryable && attempt < MAX_PROVIDER_ATTEMPTS) {
        await sleepWithSignal(
          options.sleep,
          250 * 2 ** (attempt - 1),
          options.signal,
        );
        continue;
      }
      throw new SocialSyncError(`provider_response_${responseCode}`, {
        requestId,
        retryable,
      });
    }
    return { data: root.data, requestId };
  }
  throw new SocialSyncError("provider_attempts_exhausted", { retryable: true });
}

function normalizeTikTokProfile(dataValue: unknown): NormalizedSocialProfile {
  const data = record(dataValue);
  const userInfo = record(data?.user_info);
  const user = record(userInfo?.user) ?? record(data?.user) ?? data;
  const stats = record(userInfo?.stats) ?? record(data?.stats) ??
    record(user?.stats);
  if (!user) throw new SocialSyncError("provider_invalid_profile");
  const handle = stringValue(user.unique_id, user.uniqueId);
  const providerAccountId = stringValue(
    user.sec_uid,
    user.sec_user_id,
    user.uid,
    user.id,
  );
  if (!handle || !providerAccountId) {
    throw new SocialSyncError("provider_invalid_profile");
  }
  const isPrivate = explicitPrivacyValue(
    user.secret,
    user.is_private_account,
    user.private_account,
  );
  if (isPrivate === null) {
    throw new SocialSyncError("provider_privacy_state_unknown");
  }
  if (isPrivate) throw new SocialSyncError("private_account_not_supported");
  return {
    provider: "tiktok",
    providerAccountId,
    handle,
    displayName: stringValue(user.nickname, user.display_name) ?? handle,
    canonicalUrl: `https://www.tiktok.com/@${handle}`,
    bio: stringValue(user.signature),
    avatarUrl: imageUrl(user.avatar_larger) ?? imageUrl(user.avatar_medium) ??
      imageUrl(user.avatar_thumb),
    verified: booleanValue(user.verified, user.is_verified) ||
      (numberValue(user.verification_type) ?? 0) > 0,
    private: false,
    publicMetrics: metrics([
      ["followers", numberValue(stats?.follower_count)],
      ["following", numberValue(stats?.following_count)],
      ["posts", numberValue(stats?.aweme_count)],
      ["likes", numberValue(stats?.total_favorited, stats?.heart_count)],
    ]),
  };
}

function normalizeTikTokPosts(
  dataValue: unknown,
  profile: NormalizedSocialProfile,
): { items: NormalizedSocialContent[]; cursor: string | null } {
  const data = record(dataValue);
  const rawItems = Array.isArray(data?.aweme_list)
    ? data.aweme_list.slice(0, 20)
    : [];
  const items: NormalizedSocialContent[] = [];
  for (const rawItem of rawItems) {
    const item = record(rawItem);
    if (!item) continue;
    const providerContentId = stringValue(item.aweme_id, item.id);
    if (!providerContentId) continue;
    const author = record(item.author);
    const authorId = stringValue(
      author?.sec_uid,
      author?.sec_user_id,
      author?.uid,
      author?.id,
    );
    const authorHandle = stringValue(author?.unique_id, author?.username);
    assertContentAuthorIdentity(profile, authorId, authorHandle);
    const video = record(item.video);
    const statistics = record(item.statistics) ?? record(item.stats);
    const imagePost = record(item.image_post_info);
    items.push({
      provider: "tiktok",
      providerContentId,
      canonicalUrl:
        `https://www.tiktok.com/@${profile.handle}/video/${providerContentId}`,
      contentType: Array.isArray(imagePost?.images) ? "carousel" : "video",
      title: null,
      textContent: stringValue(item.desc, item.description),
      thumbnailUrl: imageUrl(video?.cover) ?? imageUrl(video?.origin_cover) ??
        imageUrl(item.cover),
      publishedAt: epochIso(item.create_time, item.createTime),
      publicMetrics: metrics([
        ["views", numberValue(statistics?.play_count)],
        ["likes", numberValue(statistics?.digg_count)],
        ["comments", numberValue(statistics?.comment_count)],
        ["shares", numberValue(statistics?.share_count)],
        ["saves", numberValue(statistics?.collect_count)],
      ]),
    });
  }
  return { items, cursor: stringValue(data?.max_cursor) };
}

function normalizeInstagramProfile(
  dataValue: unknown,
): NormalizedSocialProfile {
  const data = record(dataValue);
  const user = record(data?.user) ?? data;
  if (!user) throw new SocialSyncError("provider_invalid_profile");
  const handle = stringValue(user.username);
  const providerAccountId = stringValue(user.id, user.pk);
  if (!handle || !providerAccountId) {
    throw new SocialSyncError("provider_invalid_profile");
  }
  const isPrivate = explicitPrivacyValue(user.is_private, user.private);
  if (isPrivate === null) {
    throw new SocialSyncError("provider_privacy_state_unknown");
  }
  if (isPrivate) throw new SocialSyncError("private_account_not_supported");
  const followedBy = record(user.edge_followed_by);
  const follows = record(user.edge_follow);
  const timeline = record(user.edge_owner_to_timeline_media);
  return {
    provider: "instagram",
    providerAccountId,
    handle,
    displayName: stringValue(user.full_name, user.name) ?? handle,
    canonicalUrl: `https://www.instagram.com/${handle}/`,
    bio: stringValue(user.biography, user.bio),
    avatarUrl: imageUrl(user.profile_pic_url_hd) ??
      imageUrl(user.profile_pic_url),
    verified: booleanValue(user.is_verified, user.verified),
    private: false,
    publicMetrics: metrics([
      ["followers", numberValue(user.follower_count, followedBy?.count)],
      ["following", numberValue(user.following_count, follows?.count)],
      ["posts", numberValue(user.media_count, timeline?.count)],
    ]),
  };
}

function instagramContentType(item: UnknownRecord): string {
  if (stringValue(item.product_type)?.toLowerCase() === "clips") return "reel";
  const mediaType = numberValue(item.media_type);
  if (mediaType === 8) return "carousel";
  if (mediaType === 2) return "video";
  return "image";
}

function normalizeInstagramPosts(
  dataValue: unknown,
  profile: NormalizedSocialProfile,
): { items: NormalizedSocialContent[]; cursor: string | null } {
  const data = record(dataValue);
  const rawItems = Array.isArray(data?.items) ? data.items.slice(0, 20) : [];
  const items: NormalizedSocialContent[] = [];
  for (const rawItem of rawItems) {
    const item = record(rawItem);
    if (!item) continue;
    const providerContentId = stringValue(item.id, item.pk);
    const shortcode = stringValue(item.code, item.shortcode);
    if (!providerContentId || !shortcode) continue;
    const author = record(item.user) ?? record(item.owner);
    const authorId = stringValue(author?.id, author?.pk);
    const authorHandle = stringValue(author?.username);
    assertContentAuthorIdentity(profile, authorId, authorHandle);
    const caption = record(item.caption);
    const imageVersions = record(item.image_versions2);
    items.push({
      provider: "instagram",
      providerContentId,
      canonicalUrl: `https://www.instagram.com/p/${shortcode}/`,
      contentType: instagramContentType(item),
      title: null,
      textContent: stringValue(
        caption?.text,
        item.caption_text,
        item.description,
      ),
      thumbnailUrl: imageUrl(imageVersions) ?? imageUrl(item.thumbnail_url) ??
        imageUrl(item.display_url),
      publishedAt: epochIso(item.taken_at, item.timestamp),
      publicMetrics: metrics([
        ["likes", numberValue(item.like_count)],
        ["comments", numberValue(item.comment_count)],
        ["views", numberValue(item.play_count, item.view_count)],
      ]),
    });
  }
  return {
    items,
    cursor: stringValue(data?.pagination_token, data?.next_max_id),
  };
}

export function createTikHubPublicProvider(
  options: {
    apiKey: string;
    fetcher?: TikHubFetch;
    sleep?: (milliseconds: number) => Promise<void>;
  },
): PublicSocialProvider {
  const apiKey = options.apiKey.trim();
  const fetcher = options.fetcher ?? fetch;
  const sleep = options.sleep ??
    ((milliseconds: number) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)));

  return {
    async sync(
      connection: PublicSocialConnection,
      context?: SocialSyncContext,
    ): Promise<PublicSocialSyncResult> {
      throwIfInvocationAborted(context?.signal);
      assertSafePublicConnection(connection);
      if (!apiKey) throw new SocialSyncError("tikhub_api_key_missing");
      const handle = publicHandle(
        connection.platform,
        connection.accountIdentifier,
      );
      const assertProfileIdentity = (profile: NormalizedSocialProfile) => {
        const expectedProviderId = connection.providerAccountId?.trim();
        const matches = expectedProviderId
          ? profile.providerAccountId === expectedProviderId
          : profile.handle.toLowerCase() === handle.toLowerCase();
        if (!matches) throw new SocialSyncError("provider_identity_mismatch");
      };

      if (connection.platform === "tiktok") {
        const identity: Record<string, string | number> =
          connection.providerAccountId
            ? { sec_user_id: connection.providerAccountId }
            : { unique_id: handle };
        const profileEnvelope = await tikhubGet(TIKTOK_PROFILE_PATH, identity, {
          apiKey,
          fetcher,
          sleep,
          signal: context?.signal,
        });
        const profile = normalizeTikTokProfile(profileEnvelope.data);
        assertProfileIdentity(profile);
        const postsEnvelope = await tikhubGet(TIKTOK_POSTS_PATH, {
          ...identity,
          max_cursor: 0,
          count: 20,
          sort_type: 0,
        }, { apiKey, fetcher, sleep, signal: context?.signal });
        const page = normalizeTikTokPosts(postsEnvelope.data, profile);
        return {
          profile,
          items: page.items,
          requestId: postsEnvelope.requestId ?? profileEnvelope.requestId,
          cursor: page.cursor,
          endpoint: TIKTOK_POSTS_PATH,
        };
      }

      const identity: Record<string, string | number> =
        connection.providerAccountId
          ? { user_id: connection.providerAccountId }
          : { username: handle };
      const profileEnvelope = await tikhubGet(
        INSTAGRAM_PROFILE_PATH,
        identity,
        { apiKey, fetcher, sleep, signal: context?.signal },
      );
      const profile = normalizeInstagramProfile(profileEnvelope.data);
      assertProfileIdentity(profile);
      const postsEnvelope = await tikhubGet(INSTAGRAM_POSTS_PATH, identity, {
        apiKey,
        fetcher,
        sleep,
        signal: context?.signal,
      });
      const page = normalizeInstagramPosts(postsEnvelope.data, profile);
      return {
        profile,
        items: page.items,
        requestId: postsEnvelope.requestId ?? profileEnvelope.requestId,
        cursor: page.cursor,
        endpoint: INSTAGRAM_POSTS_PATH,
      };
    },
  };
}
