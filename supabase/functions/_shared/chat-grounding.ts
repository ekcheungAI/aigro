export function citedChunkIndexes(
  answer: string,
  chunkCount: number,
): Set<number> {
  const used = new Set<number>();
  for (const match of answer.matchAll(/\[S([^\]\r\n]*)\]/gi)) {
    const rawIndex = match[1];
    const index = Number(rawIndex);
    if (!/^[1-9]\d*$/.test(rawIndex) || index > chunkCount) {
      throw new Error("Grounded answer contained an invalid source marker");
    }
    used.add(index);
  }
  return used;
}

export function safeHttpsCitationHref(value: unknown): string {
  if (typeof value !== "string") return "";
  const href = value.trim();
  const hasControlCharacter = [...href].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });
  if (!href || hasControlCharacter) return "";
  try {
    const url = new URL(href);
    if (url.protocol !== "https:" || url.username || url.password) return "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

export function sanitizeCitationHrefs(
  value: unknown,
): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const citation = entry as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};
    if (Object.hasOwn(citation, "marker")) sanitized.marker = citation.marker;
    sanitized.href = safeHttpsCitationHref(citation.href);
    for (const key of [
      "title",
      "excerpt",
      "revision_id",
      "section",
      "page",
      "start_seconds",
      "end_seconds",
    ]) {
      if (Object.hasOwn(citation, key)) sanitized[key] = citation[key];
    }
    return [sanitized];
  });
}

export function citationPromptRules(hasSources: boolean): string {
  if (!hasSources) {
    return `- 今次沒有檢索到已批准來源；只可以用一般知識回答，並要清楚標明限制。
- 因為今次沒有來源，唔可以輸出 [S1]、[S2] 或任何來源標記。`;
  }
  return `- 引用只可以指向下面提供嘅來源，唔好自己創作來源。
- 使用任何來源支持嘅具體事實、方法或導師觀點時，該句句尾必須加一個或以上精確標記，例如 [S1] [S2]；唔可以用不存在嘅編號。
- 如果今次有檢索來源但沒有任何來源真正支持答案，請只回答「現有知識庫未有足夠資料」，仍然唔好虛構標記。`;
}

/**
 * General answers have no source catalogue, so numeric [S#] markers are always
 * fabricated. Hold a possible split marker until it closes, then remove it from
 * both the live stream and the answer that will be persisted.
 */
export function createGeneralStreamFilter(
  emit: (text: string) => void,
): { push: (text: string) => void; finish: () => string } {
  let pending = "";
  let sanitized = "";

  const emitSafe = (text: string) => {
    if (!text) return;
    sanitized += text;
    emit(text);
  };

  const drain = (final: boolean) => {
    while (pending) {
      const markerStart = /\[S/i.exec(pending);
      if (!markerStart) {
        const retained = !final && pending.endsWith("[") ? "[" : "";
        emitSafe(pending.slice(0, pending.length - retained.length));
        pending = retained;
        return;
      }

      emitSafe(pending.slice(0, markerStart.index));
      pending = pending.slice(markerStart.index);
      const closeIndex = pending.indexOf("]", 2);
      const newlineMatch = /[\r\n]/.exec(pending.slice(2));
      const newlineIndex = newlineMatch ? newlineMatch.index + 2 : -1;

      if (closeIndex >= 0 && (newlineIndex < 0 || closeIndex < newlineIndex)) {
        const candidate = pending.slice(0, closeIndex + 1);
        const rawIndex = pending.slice(2, closeIndex);
        pending = pending.slice(closeIndex + 1);
        if (!/^\s*\d+\s*$/.test(rawIndex)) emitSafe(candidate);
        continue;
      }

      if (newlineIndex >= 0) {
        emitSafe(pending.slice(0, newlineIndex + 1));
        pending = pending.slice(newlineIndex + 1);
        continue;
      }

      if (final) {
        emitSafe(pending);
        pending = "";
      }
      return;
    }
  };

  return {
    push(text: string) {
      pending += text;
      drain(false);
    },
    finish() {
      drain(true);
      return sanitized;
    },
  };
}

export const GROUNDING_ABSTENTION = "現有知識庫未有足夠資料";

export function isGroundingAbstention(answer: string): boolean {
  return /^現有知識庫未有足夠資料[。.]?$/.test(answer.trim());
}

export interface GroundedStreamResult {
  indexes: Set<number>;
  abstained: boolean;
}

/**
 * Streams only text that has reached a closed, valid source marker. Text after
 * the last marker remains private until it is validated at EOF. The one allowed
 * no-marker path is the exact knowledge-gap abstention.
 */
export function createGroundedStreamGate(
  chunkCount: number,
  emit: (text: string) => void,
): { push: (text: string) => void; finish: () => GroundedStreamResult } {
  let pending = "";
  let emitted = "";
  const indexes = new Set<number>();

  const emitValidated = (text: string, used: Set<number>) => {
    for (const index of used) indexes.add(index);
    emitted += text;
    emit(text);
  };

  const drainClosedMarkers = () => {
    while (true) {
      const marker = /\[S[^\]\r\n]*\]/i.exec(pending);
      if (!marker) return;
      const end = marker.index + marker[0].length;
      const candidate = pending.slice(0, end);
      const used = citedChunkIndexes(candidate, chunkCount);
      if (used.size === 0) {
        throw new Error(
          "Grounded answer segment did not contain a valid source marker",
        );
      }
      pending = pending.slice(end);
      emitValidated(candidate, used);
    }
  };

  return {
    push(text: string) {
      pending += text;
      drainClosedMarkers();
    },
    finish() {
      drainClosedMarkers();
      if (pending.trim()) {
        const used = citedChunkIndexes(pending, chunkCount);
        if (used.size > 0) {
          emitValidated(pending, used);
          pending = "";
        } else if (
          indexes.size === 0 && isGroundingAbstention(emitted + pending)
        ) {
          emit(pending);
          pending = "";
          return { indexes, abstained: true };
        } else {
          throw new Error("Grounded answer ended with unsupported text");
        }
      }
      if (indexes.size === 0) {
        throw new Error(
          "Grounded answer did not contain a valid source marker",
        );
      }
      return { indexes, abstained: false };
    },
  };
}
