export interface ProviderUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface ParsedProviderStream {
  text: string;
  usage: ProviderUsage;
  providerRequestId: string | null;
}

export function providerTimeoutMs(rawValue?: string | null): number {
  const value = Number(rawValue);
  return Number.isFinite(value) && value > 0 ? value : 15_000;
}

export function providerUnavailablePayload(): {
  code: "instructor_unavailable";
  retryable: true;
} {
  return {
    code: "instructor_unavailable",
    retryable: true,
  };
}

export interface ProviderDeadline {
  signal: AbortSignal;
  abort: () => void;
  clear: () => void;
}

export function createProviderDeadline(timeoutMs: number): ProviderDeadline {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(
      new DOMException("Provider request timed out", "TimeoutError"),
    );
  }, timeoutMs);
  return {
    signal: controller.signal,
    abort: () => {
      clearTimeout(timeoutId);
      controller.abort(
        new DOMException("Client cancelled stream", "AbortError"),
      );
    },
    clear: () => clearTimeout(timeoutId),
  };
}

const THINK_OPEN = "<think>";
const THINK_CLOSE = "</think>";

function retainedPrefixLength(value: string, marker: string): number {
  const lower = value.toLowerCase();
  const maxLength = Math.min(lower.length, marker.length - 1);
  for (let length = maxLength; length > 0; length -= 1) {
    if (marker.startsWith(lower.slice(-length))) return length;
  }
  return 0;
}

class ThinkContentFilter {
  #hidden = false;
  #pending = "";

  push(input: string): string {
    let value = this.#pending + input;
    this.#pending = "";
    let visible = "";

    while (value) {
      const marker = this.#hidden ? THINK_CLOSE : THINK_OPEN;
      const index = value.toLowerCase().indexOf(marker);
      if (index >= 0) {
        if (!this.#hidden) visible += value.slice(0, index);
        value = value.slice(index + marker.length);
        this.#hidden = !this.#hidden;
        continue;
      }

      const retained = retainedPrefixLength(value, marker);
      const settledLength = value.length - retained;
      if (!this.#hidden) visible += value.slice(0, settledLength);
      this.#pending = value.slice(settledLength);
      break;
    }

    return visible;
  }

  finish(): string {
    const visible = this.#hidden ? "" : this.#pending;
    this.#pending = "";
    return visible;
  }
}

export async function parseMiniMaxStream(
  response: Response,
  onDelta: (text: string) => void,
): Promise<ParsedProviderStream> {
  if (!response.ok || !response.body) {
    throw new Error("Provider stream unavailable");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let usage: ProviderUsage = {};
  let providerRequestId: string | null = null;
  const thinkFilter = new ThinkContentFilter();

  const processLine = (line: string): void => {
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return;
    }
    if (typeof payload.id === "string") providerRequestId = payload.id;
    if (payload.usage && typeof payload.usage === "object") {
      usage = payload.usage as ProviderUsage;
    }
    const choices = Array.isArray(payload.choices) ? payload.choices : [];
    const first = choices[0] as Record<string, unknown> | undefined;
    const delta = first?.delta as Record<string, unknown> | undefined;
    const piece = typeof delta?.content === "string" ? delta.content : "";
    if (!piece) return;
    const visible = thinkFilter.push(piece);
    if (visible) {
      text += visible;
      onDelta(visible);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      processLine(line);
    }
  }

  buffer += decoder.decode();
  if (buffer) processLine(buffer);

  const finalVisible = thinkFilter.finish();
  if (finalVisible) {
    text += finalVisible;
    onDelta(finalVisible);
  }

  if (!text) throw new Error("Provider returned an empty response");
  return { text, usage, providerRequestId };
}
