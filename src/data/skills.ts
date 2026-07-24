/* Skills 目錄單一數據源 — 前台 /skills 目錄同後台 /admin/skills 共用。
   後台接入 Supabase 後,呢個檔會由 API 取代。 */

export type SkillTag = "設計" | "情報" | "分身" | "工作流";
export type SkillStatus = "自家" | "策劃" | "優先名單";

export const SKILL_TAGS: SkillTag[] = ["設計", "情報", "分身", "工作流"];

export interface SkillEntry {
  id: string;
  name: string;
  /** 一句價值 */
  value: string;
  /** 幾時用 */
  detail: string;
  tags: SkillTag[];
  /** 安裝指令(mono snippet) */
  install: string;
  /** 來源連結(空字串 = 未公開) */
  url: string;
  status: SkillStatus;
  /** 未公開發售 — 顯示優先名單 CTA 而唔係來源連結 */
  waitlist?: boolean;
}

export const skills: SkillEntry[] = [
  {
    id: "aigro-intel",
    name: "AIGRO 情報 Skill",
    value:
      "教你嘅 agent 正確讀取 AIGRO 情報:引用規則、來源標註、禁憑記憶回答。",
    detail:
      "想 agent 引用 AIGRO 情報嗰陣,每則結論都講得出處,唔會「聽落似啱」就當事實。",
    tags: ["情報"],
    install: "npx skills add aigro-hk/intel",
    url: "",
    status: "優先名單",
    waitlist: true,
  },
  {
    id: "perskill",
    name: "Perskill Persona Skills",
    value:
      "俾你嘅 agent 裝上專業分身 — 唔同場景,唔同人設,輸出即刻啱 tone。",
    detail:
      "想要 agent 分飾唔同角色(marketer / 分析師 / 客服)而唔使自己重寫 system prompt 嗰陣用。",
    tags: ["分身"],
    install: "npx skills add ekcheungAI/perskill",
    url: "https://github.com/ekcheungAI/perskill",
    status: "自家",
  },
  {
    id: "impeccable",
    name: "Impeccable Design",
    value:
      "將高級設計判斷寫成 agent 讀得明嘅規則 — 由 layout 到細節都有準則。",
    detail:
      "叫 agent 整 UI / landing page,想佢好似資深 designer 咁諗,而唔係齋砌 Tailwind class。",
    tags: ["設計"],
    install: "npx skills add pbakaus/impeccable",
    url: "https://github.com/pbakaus/impeccable",
    status: "策劃",
  },
  {
    id: "taste-skill",
    name: "Taste Skill",
    value: "taste 都可以裝 — 令 agent 嘅審美決策有跡可尋,唔再靠運氣。",
    detail:
      "覺得 agent 出嚟嘅嘢「似樣但冇 taste」,想要一套可以複用嘅審美框架嗰陣用。",
    tags: ["設計"],
    install: "npx skills add Leonxlnx/taste-skill",
    url: "https://github.com/Leonxlnx/taste-skill",
    status: "策劃",
  },
  {
    id: "emilkowalski-skills",
    name: "Emil Kowalski Design Skills",
    value:
      "動效大師 Emil 嘅設計詞彙同判斷 — animation vocabulary、Apple 式 interaction。",
    detail: "想精準描述 motion 效果、做 interruptible gesture / spring 動畫嗰陣用。",
    tags: ["設計"],
    install: "npx skills add emilkowalski/skills",
    url: "https://github.com/emilkowalski/skills",
    status: "策劃",
  },
  {
    id: "aihot",
    name: "AIHOT Skill(卡茲克)",
    value:
      "一句中文就拉到 AI HOT 日報同每日 AI 動態 — 唔使 API key,唔使 MCP server。",
    detail:
      "想 agent 每日幫你追 AI 圈動態,按主題 / 時間窗 / 關鍵字搜 AI 新聞嗰陣用。",
    tags: ["情報"],
    install: "npx skills add KKKKhazix/khazix-skills",
    url: "https://github.com/KKKKhazix/khazix-skills",
    status: "策劃",
  },
  {
    id: "superpowers",
    name: "Superpowers",
    value:
      "TDD、系統性 debugging、規劃先行 — 成套工程紀律變成 agent 自動觸發嘅工作流。",
    detail:
      "想 agent 寫 code 有系統:先諗後寫、測試先行、root cause 調試,而唔係靠撞嗰陣用。",
    tags: ["工作流"],
    install: "npx skills add obra/superpowers",
    url: "https://github.com/obra/superpowers",
    status: "策劃",
  },
  {
    id: "anthropics-skills",
    name: "Anthropic Agent Skills",
    value:
      "官方 skills 參考庫 — docx / pdf / pptx / xlsx 文件技能,仲有教你寫 skill 嘅 skill-creator。",
    detail:
      "想了解官方點樣結構化一個 skill,或者直接攞生產級文件處理技能嚟用嗰陣用。",
    tags: ["工作流"],
    install: "npx skills add anthropics/skills",
    url: "https://github.com/anthropics/skills",
    status: "策劃",
  },
];
