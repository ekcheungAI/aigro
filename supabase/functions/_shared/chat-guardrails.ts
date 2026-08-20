/** Trust-boundary input guardrails shared by the instructor Edge Function. */

export type ChatGuardKind = "spam" | "harmful" | "jailbreak" | "personal-data";

const JAILBREAK_RE =
  /忽略(之前|先前|以上|所有)|無視(之前|先前|以上|所有)|ignore (all |previous |prior )?instructions|system prompt|系統提示詞|系統提示|你嘅系統指示|你嘅指示|你嘅\s?prompt|顯示你嘅|交出你嘅|jailbreak|越獄|reveal your (prompt|instructions)|開發者模式|developer mode|DAN\b/i;

const HARMFUL_RE =
  /炸彈|爆炸品|製毒|販毒|冰毒|可卡因|氯胺酮|武器製造|自製槍|殺人方法|自殺方法|自殘方法|入侵(系統|網站|電腦|帳號)|黑客攻擊|盜取(密碼|帳號|資料)|偷取(密碼|帳號|資料)|釣魚網站|勒索軟件|木馬|malware|ransomware|phishing|\bbomb\b|how to (make|build) (a )?(bomb|weapon)|\bkill (someone|a person)\b/i;

const PERSONAL_DATA_RE =
  /(jimmy|elvin|劉泰麟|佢|佢哋)\s*嘅\s*(私人)?(電話|手機|號碼|身份證|住址|地址|密碼|電郵)|(電話|手機|身份證|住址|密碼)(號碼)?\s*(係|是)?\s*(幾多|多少|咩).{0,10}(jimmy|elvin|佢)|(jimmy|elvin|lau|cheung)('s|’) ?(private )?(phone|number|address|email|password)/i;

export function classifyChatInput(value: string): ChatGuardKind | null {
  const q = value.trim();
  if (!q || q.length > 800 || /(.)\1{9,}/su.test(q) || !/[\p{L}\p{N}]/u.test(q)) {
    return "spam";
  }
  if (JAILBREAK_RE.test(q)) return "jailbreak";
  if (HARMFUL_RE.test(q)) return "harmful";
  if (PERSONAL_DATA_RE.test(q)) return "personal-data";
  return null;
}
