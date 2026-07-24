/**
 * 主題地圖數據層 — 多行業情報網的主題索引（AI 行業先發）。
 *
 * 三個主題群組：公司與模型（15）、技術方向（10）、內容形態（6）。
 * 每個主題以 keywords 對 aihotInsights 做關鍵詞比對，得出「本週 N 則」
 * 相關動態計數；卡片連結到即時動態 feed 的搜尋 / 分類篩選狀態。
 */
import { aihotInsights, type AihotInsight } from "./aihot";
import {
  INSIGHT_CATEGORY_SLUGS,
  type InsightCategory,
} from "./insights";

/* ============ 型別 ============ */

export interface TopicDef {
  id: string;
  /** 繁體主題名（卡片主標題） */
  name: string;
  /** 英文副名（如有，mono 小字展示） */
  nameEn?: string;
  /** 2 字符 monogram tile 文字（無 logo 或 logo 載入失敗時的 fallback） */
  mono: string;
  /**
   * Simple Icons slug — 真實公司 logo 經 cdn.simpleicons.org/<slug> 載入；
   * 留空或載入失敗（onError）即 fallback 到 monogram tile。
   */
  logo?: string;
  /** 一句繁體描述 */
  desc: string;
  /** 比對用關鍵詞（小寫 substring 比對 title / titleEn / summary）；首個亦作 feed 搜尋詞 */
  keywords: string[];
  /** 內容形態專用：直達 feed 分類篩選（優先於 keywords 搜尋） */
  category?: InsightCategory;
}

export interface TopicGroup {
  id: string;
  name: string;
  nameEn: string;
  desc: string;
  topics: TopicDef[];
}

/* ============ 公司與模型（15） ============ */

const COMPANY_TOPICS: TopicDef[] = [
  {
    id: "openai",
    name: "OpenAI / ChatGPT",
    mono: "OA",
    desc: "追蹤 GPT、ChatGPT、Sora,以及 OpenAI 嘅產品、研究同公司動向。",
    keywords: ["openai", "chatgpt", "gpt", "sora"],
  },
  {
    id: "anthropic",
    name: "Anthropic / Claude",
    mono: "AN",
    logo: "anthropic",
    desc: "追蹤 Claude、Claude Code、安全研究,以及 Anthropic 嘅產品同公司進展。",
    keywords: ["claude", "anthropic"],
  },
  {
    id: "google",
    name: "Google / Gemini",
    mono: "GO",
    logo: "google",
    desc: "追蹤 Gemini、DeepMind、Veo,以及 Google 嘅 AI 產品同研究生態。",
    keywords: ["gemini", "deepmind", "veo", "google"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    mono: "DS",
    logo: "deepseek",
    desc: "追蹤 DeepSeek 嘅模型發佈、開源權重、技術報告同產品進展。",
    keywords: ["deepseek"],
  },
  {
    id: "qwen",
    name: "通義千問 Qwen",
    mono: "QW",
    logo: "qwen",
    desc: "追蹤 Qwen 系列模型、開源版本、端側模型同阿里 AI 生態。",
    keywords: ["qwen", "通義", "千問"],
  },
  {
    id: "kimi",
    name: "Kimi / 月之暗面",
    mono: "KI",
    logo: "kimi",
    desc: "追蹤 Kimi 模型、長上下文技術、開源路線同產品更新。",
    keywords: ["kimi", "月之暗面"],
  },
  {
    id: "minimax",
    name: "MiniMax",
    mono: "MM",
    logo: "minimax",
    desc: "追蹤 MiniMax 嘅大模型、語音、多模態能力同商業產品。",
    keywords: ["minimax"],
  },
  {
    id: "zhipu",
    name: "智譜 GLM",
    mono: "GL",
    desc: "追蹤 GLM 模型、開源發佈、編程與推理能力,以及智譜生態。",
    keywords: ["glm", "智譜", "智谱"],
  },
  {
    id: "xai",
    name: "xAI / Grok",
    mono: "XA",
    logo: "x",
    desc: "追蹤 Grok 模型迭代、算力部署,以及 xAI 同 X 平台嘅整合。",
    keywords: ["grok", "xai"],
  },
  {
    id: "meta",
    name: "Meta / Llama",
    mono: "ME",
    logo: "meta",
    desc: "追蹤 Llama 開源模型、Meta AI 產品、研究團隊同公司策略。",
    keywords: ["llama", "meta"],
  },
  {
    id: "microsoft",
    name: "Microsoft / Copilot",
    mono: "MS",
    desc: "追蹤 Copilot、Azure AI、模型基建,以及 Microsoft 嘅 AI 產品線。",
    keywords: ["copilot", "microsoft", "微軟"],
  },
  {
    id: "nvidia",
    name: "NVIDIA",
    mono: "NV",
    logo: "nvidia",
    desc: "追蹤 GPU、CUDA、AI 基建、機械人平台同算力市場變化。",
    keywords: ["nvidia", "cuda", "gpu"],
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    mono: "HF",
    logo: "huggingface",
    desc: "追蹤開源模型、數據集、社群工具同排行榜嘅最新變化。",
    keywords: ["hugging face", "huggingface"],
  },
  {
    id: "cursor",
    name: "Cursor",
    mono: "CU",
    logo: "cursor",
    desc: "追蹤 Cursor 編輯器、Agent 功能、模型選擇同開發者工作流程。",
    keywords: ["cursor"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    mono: "OR",
    logo: "openrouter",
    desc: "追蹤模型上架、路由服務、用量排行同開發者選型訊號。",
    keywords: ["openrouter"],
  },
];

/* ============ 技術方向（10） ============ */

const TECH_TOPICS: TopicDef[] = [
  {
    id: "agent",
    name: "AI Agent",
    mono: "AG",
    desc: "模型自主規劃、調用工具、完成多步任務,以及相關框架與評測。",
    keywords: ["agent", "智能體", "代理人"],
  },
  {
    id: "coding",
    name: "AI 編程",
    mono: "CO",
    desc: "編程助手、程式碼模型、Vibe Coding 與開發流程嘅變化。",
    keywords: ["編程", "coding", "程式碼", "代碼", "codex"],
  },
  {
    id: "reasoning",
    name: "推理能力",
    mono: "RE",
    desc: "推理模型、數學與邏輯能力、思維鏈方法及其評測爭議。",
    keywords: ["推理", "reasoning", "思維鏈"],
  },
  {
    id: "multimodal",
    name: "多模態",
    mono: "MU",
    desc: "文字、圖像、語音與影片嘅混合輸入輸出能力及產品應用。",
    keywords: ["多模態", "multimodal", "多模态"],
  },
  {
    id: "image-gen",
    name: "圖像生成",
    mono: "IG",
    desc: "文生圖、圖像編輯、角色一致性與視覺創作工具嘅進展。",
    keywords: ["圖像", "文生圖", "image", "flux", "midjourney"],
  },
  {
    id: "video",
    name: "AI 影片",
    mono: "VI",
    desc: "影片生成、理解、編輯模型,以及影像創作工具與工作流程。",
    keywords: ["影片", "視頻", "video", "sora", "veo"],
  },
  {
    id: "audio",
    name: "語音與音訊",
    mono: "AU",
    desc: "語音合成、即時對話、音樂生成與音訊理解嘅模型與產品。",
    keywords: ["語音", "音訊", "音頻", "voice", "audio", "tts"],
  },
  {
    id: "edge",
    name: "端側 AI",
    mono: "ED",
    desc: "手機、電腦與邊緣裝置上嘅小模型、本地推理與晶片進展。",
    keywords: ["端側", "端侧", "本地", "邊緣", "on-device"],
  },
  {
    id: "opensource",
    name: "開源生態",
    mono: "OS",
    desc: "開源模型、框架、權重與社群專案,以及開源與閉源嘅消長。",
    keywords: ["開源", "开源", "open source", "open-source", "權重"],
  },
  {
    id: "mcp",
    name: "MCP 與工具調用",
    mono: "MC",
    desc: "MCP、function calling、外部工具連接與 Agent 工具鏈整合。",
    keywords: ["mcp", "工具調用", "工具调用", "function calling"],
  },
];

/* ============ 內容形態（6） ============ */

const FORMAT_TOPICS: TopicDef[] = [
  {
    id: "model-release",
    name: "模型發佈",
    mono: "MO",
    desc: "新模型、開源權重、版本迭代、能力、價格與可用性變化。",
    keywords: ["模型發佈", "發佈", "release"],
    category: "模型發布",
  },
  {
    id: "product-update",
    name: "產品更新",
    mono: "PR",
    desc: "AI 產品與應用嘅功能上新、改版、定價與商業化動向。",
    keywords: ["產品", "更新", "update"],
    category: "產品發布",
  },
  {
    id: "research",
    name: "論文研究",
    mono: "PA",
    desc: "重要 AI 論文、研究成果、架構與訓練方法嘅近期進展。",
    keywords: ["論文", "paper", "研究"],
    category: "論文研究",
  },
  {
    id: "benchmark",
    name: "評測基準",
    mono: "BE",
    desc: "模型排行榜、Benchmark 成績、評測方法與能力測量爭議。",
    keywords: ["評測", "benchmark", "基準", "排行榜", "leaderboard"],
  },
  {
    id: "tutorial",
    name: "教程實踐",
    mono: "TU",
    desc: "提示詞、工具用法、工作流程、實作教學與常見踩坑經驗。",
    keywords: ["教程", "教學", "實踐", "技巧", "prompt"],
    category: "觀點與技巧",
  },
  {
    id: "policy",
    name: "政策監管",
    mono: "PO",
    desc: "AI 監管、政策法規、安全框架與各地治理動向。",
    keywords: ["監管", "政策", "法規", "regulation", "法案"],
  },
];

/* ============ 群組 ============ */

export const TOPIC_GROUPS: TopicGroup[] = [
  {
    id: "companies",
    name: "公司與模型",
    nameEn: "Companies & Models",
    desc: "按公司與模型系列追蹤 — 邊個推出咗甚麼,產品路線點樣轉。",
    topics: COMPANY_TOPICS,
  },
  {
    id: "tech",
    name: "技術方向",
    nameEn: "Technical Directions",
    desc: "按能力與技術路線深入 — 由 Agent、多模態到開源與工具鏈。",
    topics: TECH_TOPICS,
  },
  {
    id: "formats",
    name: "內容形態",
    nameEn: "Content Formats",
    desc: "按資訊類型瀏覽 — 由模型發佈到評測、教程與政策。",
    topics: FORMAT_TOPICS,
  },
];

/** 全部主題總數（標頭 copy 用） */
export const TOPIC_TOTAL = TOPIC_GROUPS.reduce(
  (sum, group) => sum + group.topics.length,
  0
);

/* ============ 比對與連結 ============ */

/**
 * 主題相關動態計數 — 對 aihotInsights（精選 50 則）做關鍵詞比對：
 * 有指定分類嘅主題按分類計數，其餘按 keywords 小寫 substring 比對
 * 標題 / 英文標題 / 摘要。
 */
export function countTopicItems(
  topic: TopicDef,
  items: AihotInsight[] = aihotInsights
): number {
  if (topic.category) {
    return items.filter((i) => i.category === topic.category).length;
  }
  return items.filter((i) => {
    const haystack =
      `${i.title} ${i.titleEn ?? ""} ${i.summary}`.toLowerCase();
    return topic.keywords.some((k) => haystack.includes(k.toLowerCase()));
  }).length;
}

/**
 * 主題卡連結 — 預設去即時動態 feed 搜尋（?tab=feed&mode=all&q=首個關鍵詞）;
 * 內容形態有對應分類嘅主題直達分類篩選（?tab=feed&category=）。
 */
export function topicHref(topic: TopicDef): string {
  if (topic.category) {
    return `/insights?tab=feed&category=${INSIGHT_CATEGORY_SLUGS[topic.category]}`;
  }
  return `/insights?tab=feed&mode=all&q=${encodeURIComponent(
    topic.keywords[0]
  )}`;
}
