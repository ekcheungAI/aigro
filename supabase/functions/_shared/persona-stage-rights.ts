import { hasCompleteRevisionCoverage } from "./persona-compiler.ts";

export const PERSONA_SOURCE_SNAPSHOT_NOT_AUTHORIZED =
  "persona_source_snapshot_not_authorized";

export function assertExactPersonaRevisionCoverage(
  expectedRevisionIds: string[],
  authorizedRevisionIds: string[],
): void {
  if (!hasCompleteRevisionCoverage(expectedRevisionIds, authorizedRevisionIds)) {
    throw new Error(PERSONA_SOURCE_SNAPSHOT_NOT_AUTHORIZED);
  }
}

/** Revalidate the complete pinned corpus immediately before a provider call. */
export async function callWithCurrentPersonaAuthorization<T>(
  expectedRevisionIds: string[],
  loadAuthorizedRevisionIds: () => Promise<string[]>,
  providerCall: () => Promise<T>,
): Promise<T> {
  const authorizedRevisionIds = await loadAuthorizedRevisionIds();
  assertExactPersonaRevisionCoverage(expectedRevisionIds, authorizedRevisionIds);
  return await providerCall();
}
