export const AVATAR_BUCKET = "member-avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const HONG_KONG_AVATAR_PRESETS = [
  { id: "tram", label: "叮叮" },
  { id: "milk-tea", label: "港式奶茶" },
  { id: "dim-sum", label: "點心籠" },
  { id: "star-ferry", label: "天星小輪" },
  { id: "lion-rock", label: "獅子山" },
  { id: "bauhinia", label: "洋紫荊" },
  { id: "egg-tart", label: "蛋撻" },
  { id: "hk-flag", label: "香港區旗" },
] as const;

export const AVATAR_PRESET_COUNT = HONG_KONG_AVATAR_PRESETS.length;

interface AvatarFileLike {
  type: string;
  size: number;
}

export function avatarPresetSeed(email: string, index: number): string {
  return `${email.trim().toLowerCase()}:preset:${index}`;
}

function stableAvatarHash(value: string): number {
  let hash = 2166136261;
  for (const char of value.trim().toLowerCase()) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function avatarPresetIndex(seed: string | undefined, email: string): number {
  const match = seed?.match(/:preset:(\d+)$/);
  if (match) {
    const saved = Number(match[1]);
    if (Number.isInteger(saved) && saved >= 0 && saved < AVATAR_PRESET_COUNT) return saved;
  }
  return stableAvatarHash(email) % AVATAR_PRESET_COUNT;
}

export function validateAvatarFile(file: AvatarFileLike): string | null {
  if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "請選擇 JPG、PNG 或 WebP 圖片。";
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return "圖片大小不可超過 2 MB。";
  }
  return null;
}

export function versionedAvatarUrl(url: string, version?: string): string {
  if (!version) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(version)}`;
}

export function avatarObjectPath(userId: string): string {
  return `${userId}/display-picture`;
}
