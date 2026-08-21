const CJK = /[\u3400-\u9fff]/;

// High-precision title signals. Generic consumer-tech words such as phone,
// chip, app or robot are intentionally absent: a news item must say why it is
// AI-specific before the automated publisher may surface it.
const AI_TITLE_SIGNAL = /(?:\bAI\b|\bAIGC\b|\bAGI\b|人工智(?:能|慧)|生成式|大模型|語言模型|機器學習|机器学习|深度學習|深度学习|神經網絡|神经网络|智能體|智能体|具身智能|多模態|多模态|推理模型|模型訓練|模型训练|OpenAI|ChatGPT|GPT-?\d|Anthropic|Claude|Gemini|DeepMind|Llama|Qwen|DeepSeek|Kimi|Mistral|Grok|Sora|Copilot|Hugging\s*Face|英偉達|英伟达|NVIDIA|人形機器人|人形机器人|AI\s*Agent|Agentic)/i;

const SPECIALIST_SOURCES = [
  "OpenAI",
  "Anthropic",
  "DeepMind",
  "HuggingFace",
  "TechCrunch AI",
  "量子位",
  "The Decoder",
];

const HK_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isAiSpecific(row) {
  const title = text(row.title);
  const source = text(row.source_name ?? row._source_name);
  return (
    AI_TITLE_SIGNAL.test(title) ||
    SPECIALIST_SOURCES.some((name) => source.toLowerCase().includes(name.toLowerCase()))
  );
}

export function assessNewsQuality(row, options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const maxAgeHours = Number.isFinite(options.maxAgeHours)
    ? options.maxAgeHours
    : 48;
  const blockers = [];
  const title = text(row.title);
  const summary = text(row.summary);
  const originalUrl = text(row.original_url);
  const publishedAt = text(row.published_at);

  if (!title) blockers.push("missing_title");
  if (!summary) blockers.push("missing_summary");
  if (!originalUrl) blockers.push("missing_url");
  if (!row.source_id) blockers.push("missing_source");
  if (!publishedAt) blockers.push("missing_published_at");

  if (row.lang !== "zh-HK") blockers.push("language_not_zh_hk");
  if ((title && !CJK.test(title)) || (summary && !CJK.test(summary))) {
    blockers.push("content_not_hk_chinese");
  }
  if (title && !isAiSpecific(row)) blockers.push("not_ai_specific");

  if (publishedAt) {
    const publishedMs = Date.parse(publishedAt);
    if (Number.isNaN(publishedMs)) {
      blockers.push("invalid_published_at");
    } else {
      const ageHours = (now - publishedMs) / 3_600_000;
      if (ageHours > maxAgeHours) blockers.push("outside_freshness_window");
      if (ageHours < -6) blockers.push("future_published_at");
    }
  }

  return {
    readyForPublication: blockers.length === 0,
    blockers,
  };
}

export function selectPublicationCandidates(rows, options = {}) {
  const maxPerSourcePerDay = Number.isFinite(options.maxPerSourcePerDay)
    ? Math.max(1, options.maxPerSourcePerDay)
    : 12;
  const sourceDayCounts = new Map();

  return [...rows]
    .filter((row) => assessNewsQuality(row, options).readyForPublication)
    .sort(
      (a, b) =>
        Date.parse(b.published_at ?? "") - Date.parse(a.published_at ?? ""),
    )
    .filter((row) => {
      const publishedMs = Date.parse(row.published_at);
      if (Number.isNaN(publishedMs)) return false;
      const source = row.source_id ?? row.source_name ?? row._source_name ?? "unknown";
      const key = `${source}|${HK_DAY.format(new Date(publishedMs))}`;
      const count = sourceDayCounts.get(key) ?? 0;
      if (count >= maxPerSourcePerDay) return false;
      sourceDayCounts.set(key, count + 1);
      return true;
    });
}
