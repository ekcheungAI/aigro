import {
  createProviderDeadline,
  parseMiniMaxStream,
  providerTimeoutMs,
  providerUnavailablePayload,
} from "./minimax-stream.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function delta(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

function responseFromText(text: string, chunkSize: number): Response {
  const bytes = new TextEncoder().encode(text);
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (let offset = 0; offset < bytes.length; offset += chunkSize) {
          controller.enqueue(bytes.slice(offset, offset + chunkSize));
        }
        controller.close();
      },
    }),
  );
}

Deno.test("stream parser never emits reasoning when think tags cross delta and byte boundaries", async () => {
  const providerStream = [
    delta("答覆前<th"),
    delta("ink>內部推理"),
    delta("不可外洩</thi"),
    delta("nk>答覆後"),
  ].join("");

  for (let chunkSize = 1; chunkSize <= 17; chunkSize += 1) {
    const emitted: string[] = [];
    const result = await parseMiniMaxStream(
      responseFromText(providerStream, chunkSize),
      (text) => emitted.push(text),
    );
    const visible = emitted.join("");
    assert(
      visible === "答覆前答覆後",
      `chunk ${chunkSize} emitted: ${visible}`,
    );
    assert(
      result.text === visible,
      `chunk ${chunkSize} persisted different text`,
    );
  }
});

Deno.test("stream parser skips malformed provider JSON and continues", async () => {
  const emitted: string[] = [];
  const response = responseFromText(
    `data: {"choices":\n\n${delta("可用答覆")}`,
    3,
  );

  const result = await parseMiniMaxStream(
    response,
    (text) => emitted.push(text),
  );

  assert(
    emitted.join("") === "可用答覆",
    "valid events after malformed JSON must still stream",
  );
  assert(
    result.text === "可用答覆",
    "malformed JSON must not change the saved answer",
  );
});

Deno.test("stream parser flushes a final data event without a trailing newline", async () => {
  const finalEvent = `data: ${
    JSON.stringify({
      id: "provider-request",
      choices: [{ delta: { content: "完整結尾" } }],
      usage: { total_tokens: 9 },
    })
  }`;
  const emitted: string[] = [];

  const result = await parseMiniMaxStream(
    responseFromText(finalEvent, 2),
    (text) => emitted.push(text),
  );

  assert(
    emitted.join("") === "完整結尾",
    "final partial event must be streamed",
  );
  assert(result.text === "完整結尾", "final partial event must be persisted");
  assert(
    result.providerRequestId === "provider-request",
    "final event id must be captured",
  );
  assert(result.usage.total_tokens === 9, "final event usage must be captured");
});

Deno.test("provider timeout defaults to 15 seconds and accepts a positive override", () => {
  assert(
    providerTimeoutMs(undefined) === 15_000,
    "missing timeout must default to 15 seconds",
  );
  assert(
    providerTimeoutMs("2500") === 2_500,
    "positive timeout override must be used",
  );
  assert(
    providerTimeoutMs("not-a-number") === 15_000,
    "invalid timeout must use the safe default",
  );
  assert(
    providerTimeoutMs("0") === 15_000,
    "non-positive timeout must use the safe default",
  );
});

Deno.test("provider deadline aborts the upstream signal after the timeout", async () => {
  const deadline = createProviderDeadline(5);
  let guardId: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      new Promise<void>((resolve) => {
        deadline.signal.addEventListener("abort", () => resolve(), {
          once: true,
        });
      }),
      new Promise<never>((_, reject) => {
        guardId = setTimeout(
          () => reject(new Error("deadline did not abort")),
          250,
        );
      }),
    ]);
    assert(
      deadline.signal.aborted,
      "provider signal must be aborted after the deadline",
    );
  } finally {
    if (guardId !== undefined) clearTimeout(guardId);
    deadline.clear();
  }
});

Deno.test("provider failure payload is retryable and contains no provider detail", () => {
  const payload = providerUnavailablePayload();
  const serialized = JSON.stringify(payload);

  assert(
    payload.code === "instructor_unavailable",
    "client must receive the stable error code",
  );
  assert(
    payload.retryable === true,
    "temporary provider failures must be retryable",
  );
  assert(
    !serialized.includes("message"),
    "client payload must not expose an internal message",
  );
  assert(
    !serialized.includes("provider"),
    "client payload must not expose provider details",
  );
});
