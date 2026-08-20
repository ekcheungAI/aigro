import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const template = (name: string) =>
  readFileSync(join(root, "supabase", "templates", name), "utf8");

const linkedTemplates = [
  ["confirmation.html", "AIGRO｜確認你嘅電郵地址"],
  ["recovery.html", "AIGRO｜重設密碼"],
  ["invite.html", "AIGRO 專屬邀請｜加入會員專區"],
  ["magic-link.html", "AIGRO｜安全登入連結"],
  ["email-change.html", "AIGRO 安全通知｜確認新電郵地址"],
] as const;

describe("Supabase Auth email templates", () => {
  it.each(linkedTemplates)("keeps %s branded and usable without the CTA button", (file, title) => {
    const html = template(file);
    expect(html).toContain(`<title>${title}</title>`);
    expect(html).toContain("display:none;max-height:0");
    expect(html.match(/{{ \.ConfirmationURL }}/g)).toHaveLength(3);
    expect(html).toContain("word-break:break-all");
    expect(html).toContain('lang="zh-HK"');
  });

  it.each([
    ["password-changed.html", "AIGRO 安全通知｜密碼已更新"],
    ["email-changed.html", "AIGRO 安全通知｜帳號電郵已更新"],
  ] as const)("keeps %s actionable", (file, title) => {
    const html = template(file);
    expect(html).toContain(`<title>${title}</title>`);
    expect(html).toContain("{{ .SiteURL }}/login");
    expect(html).toContain("display:none;max-height:0");
  });

  it("points every configured template at a file that exists", () => {
    const config = readFileSync(join(root, "supabase", "config.toml"), "utf8");
    for (const [file, configPath] of [
      ...linkedTemplates.map(([name]) => [name, `./supabase/templates/${name}`] as const),
      ["password-changed.html", "./templates/password-changed.html"],
      ["email-changed.html", "./templates/email-changed.html"],
    ] as const) {
      expect(config).toContain(`content_path = "${configPath}"`);
      expect(() => template(file)).not.toThrow();
    }
  });
});
