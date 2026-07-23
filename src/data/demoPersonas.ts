/**
 * 示範分身 mock data — Perskill(ekcheungAI 嘅歷史人物分身庫)demo。
 * 呢啲係 DEMO,唔係 AIGRO 領航專家:冇認證、冇 VerifiedBadge、冇金色,
 * 視覺上必須安靜過真專家(muted treatment)。
 * Perskill: https://www.perskill.com · Skill 源檔: https://github.com/ekcheungAI/perskill
 */

export interface DemoPersona {
  /** Latin 全名,如 "Leonardo da Vinci" */
  nameEn: string;
  /** 中文名,如「達文西」 */
  nameZh: string;
  /** Monogram 字母,如 "LdV" */
  initials: string;
  /** 一句本質(一行) */
  essence: string;
  /** Perskill 分身頁(external) */
  perskillUrl: string;
  /** GitHub skill 檔案(external) */
  githubUrl: string;
}

export const demoPersonas: DemoPersona[] = [
  {
    nameEn: "Leonardo da Vinci",
    nameZh: "達文西",
    initials: "LdV",
    essence: "跨界全才・觀察與聯想嘅極致",
    perskillUrl: "https://www.perskill.com/persona/leonardo-da-vinci",
    githubUrl:
      "https://github.com/ekcheungAI/perskill/tree/main/skills/leonardo-da-vinci",
  },
  {
    nameEn: "Marie Curie",
    nameZh: "居禮夫人",
    initials: "MC",
    essence: "兩屆諾獎得主・執著實證精神",
    perskillUrl: "https://www.perskill.com/persona/marie-curie",
    githubUrl:
      "https://github.com/ekcheungAI/perskill/tree/main/skills/marie-curie",
  },
  {
    nameEn: "Charles Darwin",
    nameZh: "達爾文",
    initials: "CD",
    essence: "演化論之父・耐性觀察與證據累積",
    perskillUrl: "https://www.perskill.com/persona/charles-darwin",
    githubUrl:
      "https://github.com/ekcheungAI/perskill/tree/main/skills/charles-darwin",
  },
  {
    nameEn: "Richard Feynman",
    nameZh: "費曼",
    initials: "RF",
    essence: "諾獎物理學家・第一性原理與玩心",
    perskillUrl: "https://www.perskill.com/persona/richard-feynman",
    githubUrl:
      "https://github.com/ekcheungAI/perskill/tree/main/skills/richard-feynman",
  },
  {
    nameEn: "Jesse Livermore",
    nameZh: "利弗莫爾",
    initials: "JLi",
    essence: "華爾街投機之王・趨勢與人性",
    perskillUrl: "https://www.perskill.com/persona/jesse-livermore",
    githubUrl:
      "https://github.com/ekcheungAI/perskill/tree/main/skills/jesse-livermore",
  },
  {
    nameEn: "Benjamin Graham",
    nameZh: "格拉咸",
    initials: "BG",
    essence: "價值投資之父・安全邊際",
    perskillUrl: "https://www.perskill.com/persona/benjamin-graham",
    githubUrl:
      "https://github.com/ekcheungAI/perskill/tree/main/skills/benjamin-graham",
  },
];
