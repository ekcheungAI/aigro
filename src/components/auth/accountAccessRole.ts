export type AccountAppRole = "member" | "expert" | "admin" | "super_admin";
export type MemberClass = "free" | "founding";
export type AccountMemberRole = MemberClass | Exclude<AccountAppRole, "member">;

export const DEFAULT_NEW_MEMBER_CLASS: MemberClass = "founding";

/** Resolve product role independently from the separate billing tier. */
export function memberRoleFromAccess(access: {
  app_role?: string | null;
  member_class?: string | null;
  tier?: string | null;
}): AccountMemberRole {
  if (access.app_role === "super_admin") return "super_admin";
  if (access.app_role === "admin") return "admin";
  if (access.app_role === "expert") return "expert";
  if (access.member_class === "founding") return "founding";
  if (access.member_class === "free") return "free";
  return access.tier && access.tier !== "free" ? "founding" : "free";
}
