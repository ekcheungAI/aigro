# FULL-REVIEW.md — 全站建設缺口分析 + 後端建設藍圖

> 審計基準:v1.21 codebase(master @ 239190a,branch fix-22-gap 起)。
> 方法:全 source review(`src/pages` 19 + admin 10 + portal 6 頁、`src/data` 12 module、
> `src/lib`、`scripts/`、sitemap/robots/env)+ 對照 INTEGRATION.md / ADMIN-READINESS.md / ROADMAP.md。
> 結論一句:**前端骨架完成度極高、後端係零**。所有「功能」都係 localStorage / 靜態 TS /
> build-time snapshot 驅動嘅高保真原型。

---

## 1. Executive Summary

**Site health:前端 ~90%(對 v1.x 範圍)· 後端 0% · 對 5-phase 產品願景 ~35%。**

- 35 條路由全部 live 且 polished(public 19 + admin 10 + portal 6),build 乾淨,
  死制 0(ADMIN-READINESS 已驗)。品牌系統、dark mode、SEO 基礎、AIHOT 真數據
  snapshot(2026-07-23 fetch,100 items)齊全。
- **但冇一行數據係真嘅**:auth 係 localStorage JSON,對話係 localStorage,
  專家/會員/CRM/emails 全部寫死喺 `src/data/*.ts`,Payments 係展示頁,
  MCP 報名存單機。任何 refresh 後嘅「真實性」都係幻覺。
- **安全風險(要即刻處理)**:`llmFallback.ts` 用 `VITE_LLM_API_KEY` 由瀏覽器
  直 call OpenAI-compatible endpoint — key 會入 client bundle,任何人可攞走。
  接 Kimi K3 時必須改做 server-side proxy(見 P1-4)。

**Top 5 priorities(按槓桿排序):**

1. **Supabase Auth + `profiles` 表** — 全站權限(member/expert/admin gate)嘅地基,
   member.ts 只換 3 個 function,consumer 零改動。【S】
2. **Waitlist + emails 真實收集** — Developers MCP 報名、Newsletter、Ask capture
   strip 三個入口而家全部漏數據;一張表即刻止血。【S】
3. **Conversation logging**(`conversations` + `messages`)— Ask 對話係 CRM leads、
   專家統計、KB 改善嘅唯一原料;而家全部留喺用戶瀏覽器。【S】
4. **LLM key 搬 server-side + Kimi K3 live answers** — 分身由 scripted regex
   升級做真回答;順手堵咗 bundle 洩 key 嘅窿。【M】
5. **自家情報 pipeline(Firecrawl → `items` 表)** — 擺脫對 AIHOT 第三方 API
   嘅單點依賴,admin content queue 即刻有真嘢審。【M】

---

## 2. Unbuilt Frontend(有引用但未建 / 缺失件)

| # | 缺口 | 現狀 / 證據 | 需要嘅嘢 |
|---|------|------------|---------|
| F1 | **Library.tsx 係孤兒代碼** | `src/pages/Library.tsx`(420 行,工具評測 + 模板庫)完整存在,`src/data/tools.ts` 都喺度,但 App.tsx `/library` 係 `<Navigate to="/insights">`,Navbar 無連結 — 死代碼 | 決策:恢復路由 + nav,定刪檔。若恢復,sitemap 要補 |
| F2 | **預約系統(Booking)全缺** | `ExpertProfile.tsx:428-438`「Club 優先預約」係 ghost button → toast「即將開放」;`AboutPersonaCard.tsx:300-310` 同。Phase 4 完全未開始 | Booking 頁(日曆/時段/確認)、專家檔期管理 UI、預約紀錄頁。Phase 4 範圍,P2 後先做 |
| F3 | **Checkout / 付款流程** | `Pricing.tsx`(477 行)純展示三層方案,CTA 全部去 `/join`;冇 cart、冇 Stripe session、冇成功/取消回跳頁 | Stripe Checkout 跳轉 + `/pricing/success` `/pricing/cancel` 回跳頁 + Account 訂閱狀態卡 |
| F4 | **專家申請頁** | `Experts.tsx:489-500`「邀請制・暫不開放申請」→ toast;`DataPartnership.tsx` 三個 CTA 全部 `mailto:` | 如維持邀請制:建一個簡單 interest form 頁(寫 `waitlist` kind='expert')取代 mailto,否則數據全漏 |
| F5 | **全站搜尋頁** | 只有 `Insights.tsx` 頁內 `?q=` filter;冇跨內容(insights + cases + experts + skills)搜尋 | `/search` 頁 + 統一索引;接 DB 後由 Postgres FTS / pgvector 做 |
| F6 | **通知中心** | `Account.tsx` 只有 3 個 notification toggles(寫 localStorage member record);冇通知列表、冇 inbox、冇真發送 | 可押後 — 有 `emails` 表 + Resend 之後先做會員通知中心 |
| F7 | **Loading / error / empty states** | 全站數據係 sync import,**零 async 狀態**;唯一 loading 係 `Login.tsx` 假 1s「登入中…」。接 Supabase 一刻,每頁都要補 query 狀態 | 建立共用 `<QueryState>` 組件(loading skeleton / error retry / empty);35 頁逐個接。呢個係 P0 接線嘅隱藏工作量 |
| F8 | **Sitemap 嚴重不全** | `public/sitemap.xml` 得 8 條 static URL;缺 `/skills`、`/data`、全部 `/insights/:slug`(100 條 AIHOT items + 靜態 articles)、`/cases/:slug`、`/experts/:slug`。`robots.txt` 嘅 Sitemap 用相對路徑(規範要絕對 URL) | Build-time script 由 data modules 生成 sitemap;robots 改絕對 URL |
| F9 | **Per-article OG** | `usePageMeta` 每頁 set title/desc/og:title/og:desc(好),但 `og:image` 全站共用一張 `/og-image.png`;冇 article OG、冇 canonical、冇 JSON-LD | InsightDetail/CaseDetail/ExpertProfile 加 canonical + article type OG;og-image 可押後 |
| F10 | **Emails 頁匯出 CSV** | `AdminEmails.tsx` 匯出係 toast 示範 | 接 `emails` 表後做真 CSV export(小) |

備註:`/admin/skills` 路由缺失(ADMIN-READINESS 阻塞點 #1)**已修復** — `AdminSkills.tsx` +
`/admin/skills` route + sidebar 項 + `src/data/skills.ts` 單一數據源全部到位。

---

## 3. Mock / Demo 功能總表

| 功能 | 數據來源檔 | 持久化 | 現狀細節 |
|------|-----------|--------|---------|
| Auth / 會員 | `src/components/auth/member.ts` | localStorage `aigro-member` | 4 級 role(free/founding/expert/admin)+ 3 層 tier 全站貫通;含 sanitize、舊紀錄遷移、profile completion 邏輯 — module 邊界乾淨,係全站最好嘅 swap point |
| 示範登入 | `src/pages/Login.tsx`、`Access.tsx` | 經 member.ts | 一 click 4 角色登入(demo 帳號寫死);接 auth 後要改成真 magic link + 保留 demo 模式? |
| Ask 對話 sessions | `src/components/ask/sessions.ts` | localStorage `aigro-ask-sessions-v1` | repo pattern + legacy key 遷移;Account.tsx 讀返做「對話紀錄」 |
| Ask 分身回答 | `src/data/personas.ts`(1115 行)+ `demoPersonas.ts` | 無(即算) | 加權關鍵字 regex → scripted reply;問題類型感知、多意圖 compose、session memory — 架構扮足 RAG,但答案全部人手寫 |
| Guardrail + LLM fallback | `src/lib/llmFallback.ts` | 無 | spam/harmful/jailbreak/personal-data 四類 deflect(好嘢,保留);LLM fallback 瀏覽器直 call,**key 入 bundle(安全問題)** |
| 情報數據 | `src/data/aihot-snapshot.json` + `aihot.ts` + `insights.ts` | build-time snapshot(手動 `npm run fetch:aihot`) | 第三方 AIHOT API → OpenCC 轉繁 → snapshot;attribution 規則內建。單點依賴 + 手動更新(上次 2026-07-23) |
| 專家目錄 | `src/data/experts.ts` | 靜態 | 2 verified(Jimmy/Elvin)+ 2 invited 草稿席 |
| 案例庫 | `src/data/cases.ts` | 靜態 | 手寫案例 + featured 衍生 |
| Skills 目錄 | `src/data/skills.ts` | 靜態 | 前台 /skills 同 /admin/skills 共用;waitlist CTA → /developers |
| 專家平台數據 | `src/data/portal-mock.ts` | 靜態(按 slug scoped) | portalStats / recentConversations / insights / socials;`expertSlugForEmail()` 係假 auth join |
| Portal 情報投稿 CRUD | `src/pages/portal/PortalInsights.tsx` | localStorage per-slug | 增刪改樂觀更新,refresh 同機仲在,跨機即失 |
| Admin 後台全區 | `src/data/admin-mock.ts` + `admin-mock2.ts` | 靜態 / in-memory state | dashboardKpis、members、conversations、contentQueue、studioExperts、crmLeads、emailContacts、expertSubmissions… 全部寫死;admin-mock2 會由 admin-mock/portal-mock 衍生(衍生邏輯 = 日後 DB view spec)。所有寫入轉頁即重置 |
| CRM leads | `admin-mock.ts` `crmLeads` + `crmKpis` | 靜態 | 15 樣本 + 全站 342 寫死;應由 conversation events 自動生成 |
| Emails 收集 | `components/Newsletter.tsx`、`ExpertProfile.tsx` subscribe、`Ask.tsx` capture strip、`AboutPersonaCard.tsx` capture | 前端 state / member.ts | **三個入口零持久化** — Newsletter/ExpertProfile 係純 useState 成功態;Ask/AboutPersona capture 建立 free member 留 localStorage。email 地址全部漏走 |
| MCP / waitlist 報名 | `src/pages/Developers.tsx` | localStorage `aigro-mcp-signup` | 單機一條 JSON;Account.tsx check 存在;admin 412/203/187 名單數係寫死 |
| Uploads / 蒸餾 | `src/pages/admin/AdminStudio.tsx` | 純 UI state | file picker 揀完冇上傳;蒸餾進度條係 setTimeout 狀態機 |
| Quota / 用量 | `QuotaMeter.tsx`、`admin-mock2.ts` `homepageQuota`、AdminSettings 6551 tokens | 展示用 | 全站無限(∞ 寫死);quota 數字無來源 |
| Payments | `src/pages/Pricing.tsx` | 無 | 展示頁;CTA → /join |
| Email 發送 | — | 不存在 | 全站冇任何交易式/營銷 email 真發送 |
| 主題 | `src/hooks/useTheme.ts` | localStorage | 正常,永久留 client-side,唔使接 |

---

## 4. Backend 建設藍圖(Phased)

### P0 — Connect Week(目標:一週內有真數據流入)

| # | 項目 | UI 現狀 | 後端件 | Effort |
|---|------|--------|--------|--------|
| P0-1 | **Supabase project + Auth** | Navbar/Login/Join/Account/Access/PortalLayout/AdminLayout 全部經 `member.ts` 出入,consumer 零改動 | Supabase project;`profiles` 表(auth.users 延伸,role/tier/persona/notifications jsonb);`loadMember→getSession+profiles select`、`saveMember→signUp/upsert`、`clearMember→signOut` + `onAuthStateChange` listener;email magic link;RLS policies | **S** |
| P0-2 | **Waitlist / emails 統一收集** | Developers.tsx `save()`(一個 function);Newsletter、ExpertProfile subscribe、Ask capture strip 三入口 | `waitlist`(email, kind, interests, role, unique(email,kind))+ `emails`(email, segment, status, source)表;四個入口統一 upsert;anon insert policy | **S** |
| P0-3 | **Conversation logging** | sessions.ts 已係 repo pattern;Ask.tsx 單一入口 | `conversations`(user_id nullable + anon_id, expert_id)+ `messages`(role, content, sources jsonb);sessions.ts 寫入路徑加 fire-and-forget insert(讀取暫留 localStorage);登入後 claim anon 對話 | **S** |

P0 完成後:真會員、真名單、真對話數據開始累積 — 之後所有嘢有原料。
Table 次序:`profiles → waitlist → conversations → messages`(INTEGRATION.md 第一批 SQL 已現成,照抄微調)。

### P1 — Intelligence Goes Live(2–4 週)

| # | 項目 | UI 現狀 | 後端件 | Effort |
|---|------|--------|--------|--------|
| P1-4 | **LLM live answers(Kimi K3)** | personas.ts 語氣/greeting/suggestions/followUps 保留做 system prompt 素材;llmFallback 管線、AiReply citations 結構、guardrails 全部現成 | Edge Function `ask-answer`:message →(初期)prompt + Kimi K3 生成 →(之後)pgvector 檢索 `expert_knowledge_base` → 生成附引用。**KIMI_K3_API_KEY 只存 server-side**;同時移除 `VITE_LLM_*` 直 call(堵 bundle 洩 key);`usage_logs` 記每次 call(provider/cost)— 風險 R1 嘅硬要求 | **M**(RAG 部分 L,可再拆) |
| P1-5 | **自家情報 pipeline(取代 AIHOT 依賴)** | Insights/Daily/HotTopics 全部經 typed `Insight` adapter;AdminContent 審核 queue UI 現成;AdminSettings sources UI 現成 | `sources` 表 → Edge Function cron 經 **Firecrawl** fetch → fingerprint dedupe → score → `items`(status pending/reviewed/published)→ admin queue 審核 → 前端 adapter 改讀 `items`。`Insight` 介面同 `items` columns 近 1:1;AIHOT snapshot 留做过渡 fallback | **M** |
| P1-6 | **CRM leads 自動生成** | AdminCRM 全 UI(階段 pills、360 drawer、timeline)現成;PortalLeads 現成 | `leads`(user_id, expert_id, source_message_id, intent, score, stage)由高意圖 message / 預約 click / MCP 報名 trigger insert;AdminCRM 全表 + PortalLeads RLS(`expert_id` 對 `auth.uid()`);crmKpis 改聚合 view | **M** |
| P1-7 | **experts 表 + portal 真數據** | Portal 6 頁全部按 slug scoped 讀 portal-mock,形狀已係 RLS 查詢 | `experts` 表;`expert_insights`(含 max-3 quota check);portalStats/RecentConversations 改聚合 views;`expertSlugForEmail()` 退役改 profile ↔ expert FK;PortalInsights CRUD 換 optimistic mutation | **M** |

### P2 — Platform(4 週+)

| # | 項目 | UI 現狀 | 後端件 | Effort |
|---|------|--------|--------|--------|
| P2-8 | **Uploads + 蒸餾** | AdminStudio file picker、批次入庫、蒸餾進度狀態機、KB toggle、審批、測試分身 — UI 全部就緒;PortalKB 專家審批 UI 就緒 | Storage bucket `kb-uploads`(admin-only policy)+ distillation Edge Function:download → Firecrawl(URL 類)→ chunk → embed → `expert_knowledge_base`(pgvector,`approved_by_expert` 預設 false)→ 專家 PortalKB 批核上線。需要 embedding provider | **M–L** |
| P2-9 | **Payments(Stripe)** | Pricing 三層展示 + Account tier 顯示現成;member.ts tier 預留 pro/vip | Stripe Checkout(founding one-time / 訂閱)+ `subscriptions` 表 + webhook → `profiles.tier`;成功/取消回跳頁(F3) | **M** |
| P2-10 | **Email 發送(Resend)** | Newsletter/Account toggles/AdminEmails segments 現成 | Resend integration:welcome、daily digest、weekly newsletter;`emails` 表 segment + unsubscribe token;AdminEmails 匯出真 CSV(F10) | **S–M** |
| P2-11 | **MCP server(公開 API)** | /developers 頁 + waitlist 現成;Skills 頁 install snippets 現成 | 由自家 DB(`items` 已審核 published)出 6 個 REST endpoints → 包 MCP server + SKILL.md;API key 表 + free quota 6551 tokens/day 對返 `api_quota_settings`;honor waitlist 名單發邀請 | **M** |
| P2-12 | **Quota 執行** | QuotaMeter / AdminSettings quota UI 現成(展示) | `usage_logs`(P1-4 已開始寫)+ `api_quota_settings`;先記後限:80% alert、100% auto-disable;會員對話 quota(free vs founding)最後上 | **M** |
| P2-13 | **Booking(Phase 4)** | ghost CTA ×2 | 全新建:availability、bookings 表、付款抽成 40–60%、voice avatar(MiniMax Speech)。超出本次連接範圍 | **L** |

### Admin views(零新 table,P0/P1 表到位後逐個換)

`admin_member_360`(profiles+conversations+leads join)、`admin_expert_360`、
dashboard KPIs、weekly chats、email segment summary — `admin-mock2.ts` 嘅衍生
function 已經係 view spec,照譯 SQL。Admin 用 `role='admin'` RLS policy。

---

## 5. Env Vars Checklist

| Var | 用於 | 邊度用 | 狀態 |
|-----|------|-------|------|
| `VITE_SUPABASE_URL` | Supabase client | client bundle | `.env.example` 已有 placeholder,P0 必填 |
| `VITE_SUPABASE_ANON_KEY` | Supabase client(公開,RLS 保護) | client bundle | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | admin 操作、Edge Functions | **server-side only** | P0(Edge Functions 起用時) |
| `KIMI_K3_API_KEY`(+ `KIMI_K3_BASE_URL` / model 名) | Ask live answers | **server-side only**(Edge Function) | P1;用戶將提供 key |
| `FIRECRAWL_API_KEY` | 情報 scraper + 專家材料蒸餾 | server-side only | `.env.example` 已有;**用戶已有 key** |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | Payments + webhook | server-side only | P2 |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe.js | client bundle | P2 |
| `RESEND_API_KEY` | 交易式 + digest email | server-side only | P2 |
| Embedding provider key(pgvector 用,Kimi embedding 或 OpenAI) | KB chunks 向量化 | server-side only | P1(RAG)/ P2(蒸餾) |
| `AIHOT_BASE_URL` | 過渡期 snapshot fetch | build script | 已有,可選 |
| ~~`VITE_LLM_BASE_URL` / `VITE_LLM_API_KEY` / `VITE_LLM_MODEL`~~ | 而家嘅瀏覽器直 call fallback | client bundle | **P1 時移除** — VITE_* 入 bundle,key 會洩漏;Kimi K3 接入後由 server-side proxy 取代 |

---

## 附:快速決策清單(需要 owner 拍板)

1. **F1 Library** — 恢復定刪除?(工具/模板內容完整,恢復成本低)
2. **F4 專家申請** — 維持純邀請制,定開 interest form(寫 waitlist kind='expert')?
3. **Demo 帳號** — 接真 auth 後,Login/Access 嘅一 click 示範登入保留(種子 demo users)定移除?
4. **AIHOT** — P1-5 pipeline 上線後,AIHOT 保留做其中一個 `sources` 定完全切斷?

---

*審計:v1.21(branch fix-22-gap)。證據:App.tsx 路由表、sitemap.xml、
member.ts / sessions.ts / personas.ts / llmFallback.ts / portal-mock.ts /
admin-mock(2).ts / aihot.ts 全讀;localStorage grep 10 檔;對照
INTEGRATION.md v1.19、ADMIN-READINESS.md v1.20、ROADMAP.md、AGENTS.md。*
