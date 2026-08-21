import { Converter } from "opencc-js/cn2t";

// The package's `hk` character preset deliberately keeps several glyphs that
// readers commonly perceive as Simplified (for example 用户 / 賬户). `tw`
// supplies full Traditional glyphs without the Taiwan phrase dictionary, so
// Hong Kong terms already present upstream (軟件、網絡、數據) are preserved.
const convertCharacters = Converter({ from: "cn", to: "tw" });

export function toTraditionalChinese(value) {
  return typeof value === "string" && value
    ? convertCharacters(value)
        .replace(/[\u{1F000}-\u{1FAFF}\u2600-\u27BF\u2B00-\u2BFF\uFE0F]/gu, "")
        .replace(/[ \t]+\n/g, "\n")
        .trim()
    : value;
}
