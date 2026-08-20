export interface KnowledgeRightsState {
  rights_status: string;
  rights_scope: Record<string, unknown> | null;
  revoked_at: string | null;
  expires_at: string | null;
  archived_at: string | null;
}

export function isDistillationAuthorized(
  source: KnowledgeRightsState,
  now = new Date(),
): boolean {
  if (
    source.archived_at !== null ||
    source.rights_status !== "granted" ||
    source.revoked_at !== null ||
    source.rights_scope?.distillation !== true
  ) {
    return false;
  }
  if (source.expires_at === null) return true;
  const expiresAt = Date.parse(source.expires_at);
  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

export function assertDistillationAuthorized(source: KnowledgeRightsState): void {
  if (!isDistillationAuthorized(source)) {
    throw new Error("knowledge_distillation_not_authorized");
  }
}

export function isPermanentKnowledgeRightsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return [
    "knowledge_distillation_not_authorized",
    "knowledge_rights_not_granted",
    "knowledge_rights_revoked",
    "knowledge_source_archived",
    "knowledge_content_duplicate",
  ].some((code) => message.includes(code));
}
