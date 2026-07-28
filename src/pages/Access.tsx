import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Compass,
  KeyRound,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface RoleCard {
  id: string;
  icon: LucideIcon;
  title: string;
  caption: string;
  perks: string[];
  tag?: string;
}

/** 4 級角色權限對照 — 純說明,冇任何 demo 帳號 */
const ROLE_CARDS: RoleCard[] = [
  {
    id: "free",
    icon: UserRound,
    title: "免費會員 Free",
    caption: "任何人註冊即有",
    perks: ["無限 AI 分身對話", "情報閱讀 + 香港視角解讀", "對話紀錄跨裝置同步", "收藏情報同案例"],
  },
  {
    id: "founding",
    icon: Sparkles,
    title: "創始會員 Founding",
    caption: "Club 付費會員",
    tag: "首批 100 席",
    perks: ["免費會員全部權限", "完整案例數據拆解", "MCP 優先接入名單", "創始價永久鎖定"],
  },
  {
    id: "expert",
    icon: Compass,
    title: "領航專家 Expert",
    caption: "由平台團隊邀請",
    perks: ["專家平台 /portal 全功能", "知識庫蒸餾管理", "情報投稿(max 3 規則)", "分身對話數據 + CRM leads"],
  },
  {
    id: "admin",
    icon: ShieldCheck,
    title: "管理員 Admin",
    caption: "平台團隊內部",
    perks: ["管理後台 /admin 全功能", "內容審核 + 發佈佇列", "會員 / 專家 360 管理", "Studio 蒸餾 + CRM + Emails"],
  },
];

/**
 * Access `/access` — AIGRO 4 級角色制度說明頁。
 * 深色 band 小 hero + 4 張角色權限卡 + 登入方式說明 + /login CTA。
 * 純說明頁:冇 demo 帳號、冇一 click 登入 — 角色由平台團隊按真帳號分配。
 */
export default function Access() {
  const reduced = useReducedMotion();

  return (
    <div>
      {/* ---- 小 hero:深色 band,同 Login 品牌板/footer 同族 ---- */}
      <section className="bg-band-bg text-band-text">
        <div className="mx-auto max-w-container px-6 py-16 md:py-20">
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <p className="text-overline uppercase tracking-[0.12em] text-band-ink">
              AIGRO Access
            </p>
            <h1 className="mt-3 font-display text-display">角色與權限</h1>
            <p className="mt-3 max-w-[560px] text-body-sm text-band-text-secondary">
              一頁睇晒 AIGRO 4 個角色級別各自有咩權限,
              同埋點樣取得對應身份。
            </p>
          </motion.div>
        </div>
      </section>

      {/* ---- 角色權限卡 ---- */}
      <section className="mx-auto max-w-container px-6 py-12 md:py-16">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {ROLE_CARDS.map((card, i) => (
            <motion.article
              key={card.id}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
              whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.4,
                delay: reduced ? 0 : i * 0.06,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="flex flex-col rounded-md border bg-surface p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-band-bg">
                  <card.icon className="h-5 w-5 text-band-ink" strokeWidth={1.5} />
                </span>
                {card.tag && (
                  <span className="rounded-full bg-lime-soft px-2.5 py-1 text-caption font-medium text-ink">
                    {card.tag}
                  </span>
                )}
              </div>

              <h2 className="mt-4 font-display text-h3 text-text-primary">
                {card.title}
              </h2>
              <p className="mt-1 text-caption text-text-muted">
                {card.caption}
              </p>

              <ul className="mt-4 flex flex-col gap-2">
                {card.perks.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-start gap-2 text-body-sm text-text-secondary"
                  >
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-ink"
                      strokeWidth={2}
                    />
                    {perk}
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>

        {/* ---- 點樣登入 / 點樣攞角色 ---- */}
        <div className="mt-10 flex items-start gap-3 rounded-md border border-border-strong p-5">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-ink" strokeWidth={1.5} />
          <div>
            <p className="text-label text-text-primary">
              登入用 magic link;角色由平台團隊分配
            </p>
            <p className="mt-1 text-body-sm text-text-secondary">
              AIGRO 用 Email magic link 登入,唔使密碼。註冊後預設係免費會員;
              創始會員經 Club 會員制升級;領航專家同管理員由平台團隊邀請同分配,
              唔可以自行切換。
            </p>
            <Link
              to="/login"
              className="press mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-lime px-6 text-label text-on-accent hover:bg-lime-hover"
            >
              去登入
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
