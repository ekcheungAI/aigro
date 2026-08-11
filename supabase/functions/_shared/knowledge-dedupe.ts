export interface KnowledgeDuplicateScopeInput {
  contentHash: string;
  currentRevisionId: string;
  currentSourceId: string;
  expertId: string;
}

export interface KnowledgeDuplicateScope extends KnowledgeDuplicateScopeInput {
  select: "id,knowledge_sources!knowledge_revisions_source_id_fkey!inner(expert_id)";
  expertFilterColumn: "knowledge_sources.expert_id";
}

/**
 * Defines the PostgREST query contract for instructor-scoped knowledge dedupe.
 *
 * The inner relationship is important: filtering the embedded source without an
 * inner join would not constrain the parent knowledge revision rows.
 */
export function buildKnowledgeDuplicateScope(
  input: KnowledgeDuplicateScopeInput,
): KnowledgeDuplicateScope {
  if (!input.contentHash || !input.currentRevisionId || !input.currentSourceId || !input.expertId) {
    throw new Error("invalid_knowledge_duplicate_scope");
  }

  return {
    ...input,
    select: "id,knowledge_sources!knowledge_revisions_source_id_fkey!inner(expert_id)",
    expertFilterColumn: "knowledge_sources.expert_id",
  };
}
