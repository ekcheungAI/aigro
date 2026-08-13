export function authUserDisplayName(metadata: unknown, email: string): string {
  const name = metadata && typeof metadata === "object" &&
      typeof (metadata as { name?: unknown }).name === "string"
    ? (metadata as { name: string }).name.trim()
    : "";
  return name || email.split("@")[0] || "會員";
}
