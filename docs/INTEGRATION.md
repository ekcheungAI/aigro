# INTEGRATION.md — Mock vs Supabase-Ready 審計

> v1.19 全站接入審計。誠實記錄而家邊啲係 MOCK(localStorage / 靜態 TS 數據)、
> 邊啲已經 SUPABASE-READY(換一個 module 就上得線),同埋每區嘅接入點同工作量。
> Schema 參考:`supabase/schema.sql`(已建立:profiles / waitlist / conversations /
> messages / leads / items / sources / usage_logs + RLS),路線圖:`docs/ROADMAP.md` Phase 1–2。

> **v1.24 更新(P0 Supabase 接入):** Auth、Waitlist、Conversation logging 已**接入真 Supabase**
> — 設 `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`(見 `.env.example`)即行真後端;
> 唔設 env 時全站自動回落 localStorage 示範模式(graceful,consumer 零改動)。
> 下表「已接入(需 env)」= 有 env 即真、無 env 回落 demo。

現狀總結(v1.19 基線):**當時全站零後端**。所有「帳號」係 localStorage JSON,所有內容係 `src/data/*.ts`
靜態 export 或 AIHOT snapshot JSON。好處係全部 mock 都集中喺 3 個位置
(`components/auth/member.ts`、`components/ask/sessions.ts`、`src/data/*`),
接 Supabase 時 consumer 頁面基本唔使改。

---

## 總表

| 功能 | 位置 | 現狀 | Supabase 接入點 | 工作量 |
|---|---|---|---|---|
| Auth / 會員 | `src/components/auth/member.ts` | **已接入(需 env)** — magic-link `signInWithOtp` + `profiles` upsert;`initAuth()` 訂閱 auth state,localStorage 做同步快取;無 env 回落 demo | `useMember()` hook(Navbar/Account 已用);demo 帳號 `demo:true` 唔上 Supabase | **S**(done) |
| Ask 對話 sessions | `src/components/ask/sessions.ts` | **已接入(需 env)** — localStorage 仍係讀取路徑;每 session 建 `conversations`、每訊息寫 `messages`(fire-and-forget) | 讀取路徑之後先 migrate 去 Supabase;匿名用 `getAnonId()`,登入後可 claim | **S–M**(write done) |
| Ask personas( scripted 回答) | `src/data/personas.ts` + `demoPersonas.ts` | MOCK — keyword regex → scripted reply | RAG:LLM + pgvector 檢索 `expert_knowledge_base`;personas.ts 保留做語氣 system prompt 同 fallback | **L** |
| 情報數據 | `src/data/aihot.ts` + `aihot-snapshot.json`、`insights.ts` | **已接入(v1.26 LIVE)** — 自家 argro 管道 (Zeabur) → `scripts/sync-argro-to-supabase.mjs` → Supabase `items`(status=published,GitHub Actions 每 30 分鐘);前端 `src/data/liveItems.ts` runtime 讀 published items 取代 snapshot(未成熟自動回落 snapshot)。Daily/topics 仍行 snapshot,下輪 hydrate | sync 需要 GitHub secret `SUPABASE_SECRET_KEY`;`/insights/daily` 文章連結已喺 argro 修復(A-label prompt) | **S**(done) |
| 專家目錄 | `src/data/experts.ts` | MOCK — 靜態 2 位專家 | `experts` 表;ExpertProfile/Experts 頁經 data module 讀,換 query 即接 | **S** |
| 專家平台數據 | `src/data/portal-mock.ts` | MOCK — 按 slug 寫死嘅 stats/conversations/insights/socials | `experts` / `expert_insights` / `conversations` 表 + RLS(專家只見自己);`expertSlugForEmail()` 換 auth user ↔ expert join | **M** |
| Admin 後台數據 | `src/data/admin-mock.ts` + `admin-mock2.ts` | MOCK — KPI、members、content queue、studio、expert 360 全部寫死 | 全部係上面各表嘅 **admin RLS views / 聚合 query**;唔需要新 table,需要 policies + views | **M** |
| CRM leads | `admin-mock.ts` `crmLeads` | MOCK — 靜態 lead 列表 | `leads` 表:由 conversation events(高意圖訊息、預約 click)自動生成;AdminCRM + PortalLeads 共用 | **M** |
| Emails / newsletter | `components/Newsletter.tsx`、Ask capture、AboutPersonaCard capture、Account notifications | **已接入(需 env)** — 各 capture 入口寫 `waitlist`(kind='newsletter');Account notifications 跟 `profiles` 走 | `src/lib/waitlist.ts` `captureWaitlist()` 統一入口;訂閱狀態 segment 聚合之後先做 | **S**(done) |
| MCP 報名 | `src/pages/Developers.tsx` localStorage `aigro-mcp-signup` | **已接入(需 env)** — `save()` 雙寫 localStorage + `waitlist`(kind='mcp', vertical=interests, role=builder) | `captureWaitlist()`;Account.tsx 名單狀態讀 Supabase 之後先做 | **S**(done) |
| Expert / Partner interest | `src/lib/interest.ts`(Experts / Sources / DataPartnership 表單) | **已接入(需 env)** — `appendInterest()` 雙寫 localStorage + `waitlist`(kind='expert'/'partner' + note) | `captureWaitlist()` 統一入口 | **S**(done) |
| Uploads(Studio 蒸餾) | `src/pages/admin/AdminStudio.tsx` file picker | MOCK — 揀咗 file 只係 UI state,冇上傳 | Supabase Storage bucket `kb-uploads` + distillation Edge Function(chunk→embed→`expert_knowledge_base`) | **M–L** |
| Quota / 用量 | `admin-mock2.ts` `homepageQuota`、`PORTAL_INSIGHT_QUOTA = 3` | MOCK — 而家全站無限,quota 係展示用 | `usage_logs` + `api_quota_settings` 表;先記錄後執行,會員對話 quota 之後先上 | **M** |
| Payments | `src/pages/Pricing.tsx` | MOCK — 純展示,CTA 去 /join | Stripe Checkout + `subscriptions` 表;webhook 更新 `profiles.tier`。展示層唔使改 | **M** |

---

## 分區詳情

### 1. Auth / 會員 — `src/components/auth/member.ts`【S · 已接入(需 env)】
**v1.24 已接入:** magic-link(`sendMagicLink()` → `signInWithOtp`)+ `profiles` 表雙層。
- `initAuth()`(main.tsx 入口 call)訂閱 `onAuthStateChange`:SIGNED_IN → fetch/upsert
  `profiles` → 寫 localStorage 快取 + 廣播;SIGNED_OUT → 清快取。
- `loadMember()` 維持 sync(讀 localStorage 快取)→ 舊 consumer(Login/Join/Access/
  PortalLayout/AboutPersonaCard/Ask)零改動。
- `saveMember()` 寫 localStorage + 廣播 + (已登入非 demo)upsert `profiles`;demo 帳號
  `demo:true` 唔上 Supabase。`clearMember()` 清快取 + `signOut()`。
- `useMember()` hook(`src/hooks/useMember.ts`)→ Navbar / Account 已改用,auth 狀態即時重render。
- Join onboarding 欄位經 `savePendingProfile()` 暫存,magic-link session 建立後先 upsert。

### 2. Ask sessions — `src/components/ask/sessions.ts`【S–M · write 已接入(需 env)】
**v1.24 已接入(write path):** localStorage `aigro-ask-sessions-v1` 仍係**讀取**路徑;
每個 session 第一條訊息建 `conversations` row(`user_id` 或 `anon_id` 来自 `getAnonId()`),
每條訊息(user + assistant)寫 `messages`(role/content/source/confidence/citations)。
全部 fire-and-forget、離線靜默;`sessionId ↔ conversationId` 映射持久喺 `aigro-ask-conv-map`。
**下一步:** 讀取路徑 migrate 去 Supabase、登入後 claim 匿名對話。

### 3. Personas / AI 回答 — `src/data/personas.ts`【L】
**現狀:** 每個分身 = keywords regex → `ScriptedReply`,無命中行 fallback
(信心 <0.6 → Club 優先預約 toast)。語氣、開場白、建議問題全部人工寫。
**換法:** 保留 personas.ts 做 **system prompt 同 UX 殼**(greeting、suggestions、
fallback、transparency 文案繼續用);回答生成換 Edge Function:
message → embed → pgvector match `expert_knowledge_base` → LLM 生成 → 附來源引用
(`AiReply` 已有 `sources` 結構)。呢個係最大工程,分期做。

### 4. 情報數據 — `src/data/aihot.ts`【M】
**現狀:** `scripts/fetch-aihot.mjs` build 時打 AIHOT 公共 API →
`aihot-snapshot.json`(已 OpenCC 轉繁體)→ typed adapter。Insights/Daily/InsightDetail
全部經 `Insight` 介面讀,attribution 規則已內建。
**換法:** 自家 pipeline:`sources` 表設定 → 定時 fetch(Edge Function cron)→
fingerprint dedupe → score → 寫 `items`(status: pending/reviewed/published)→
admin content queue 審核 → 前端 adapter 改讀 `items`。
`Insight` 介面同 `items` columns 幾乎 1:1,遷移阻力低。

### 5. 專家平台 — `src/data/portal-mock.ts`【M】
**現狀:** 全部數據按 expert slug scoped 寫死(`portalStats`、
`portalRecentConversations`、`portalInsights`、`portalSocials`),已係
「Supabase 接入後由 RLS 查詢取代」嘅形狀。PortalInsights 嘅投稿增刪已行
localStorage-per-slug,形態似 optimistic CRUD。
**換法:** `experts` + `expert_insights`(expert_id, title, status, published_at,
max-3 quota 用 trigger 或 check  enforcing)+ conversations 聚合 views。
RLS:`expert_id = (select expert_id from profiles where id = auth.uid())`。
`expertSlugForEmail()` 退役,改 profile ↔ expert foreign key。

### 6. Admin 後台 — `admin-mock.ts` / `admin-mock2.ts`【M】
**現狀:** dashboardKpis、weeklyChats、members、conversations、contentQueue、
expertPosts、studioExperts、crmLeads、expertStatsBySlug、emailContacts、
expertSubmissions — 全部係讀取側聚合。
**換法:** 零新 table:每個 export 對應一個 **view 或 RPC**
(例:`admin_member_360` view join profiles+conversations+leads)。
Admin 用 service role 或 `role = 'admin'` RLS policy。寫入側(審核通過/退回)
係 `items.status` 同 `expert_insights.status` update。

### 7. CRM leads — `admin-mock.ts crmLeads`【M】
**現狀:** 靜態 lead(persona、intent、score、status)。
**換法:** `leads` 表由 conversation events 生成:高意圖關鍵字、預約 click、
MCP 報名 → insert lead(user_id, expert_id, source_message_id, intent, score)。
AdminCRM 睇全表,PortalLeads RLS 只見自己 expert。

### 8. Emails / newsletter — capture 入口【S · 已接入(需 env)】
**v1.24 已接入:** Newsletter band(`components/Newsletter.tsx`)、Ask 註冊捕捉卡、
AboutPersonaCard capture — 三個入口全部經 `captureWaitlist()` 寫 `waitlist`(kind='newsletter')。
Expert/partner 表單(`interest.ts`)→ kind='expert'/'partner' + note。
Account notification toggles 跟 `profiles.notifications` 走(已登入即 sync)。
**下一步:** segment / engagement 聚合 view 俾 admin;統一 `emails` 表可考慮合併入 waitlist。

### 9. MCP 報名 — `src/pages/Developers.tsx`【S · 已接入(需 env)】
**v1.24 已接入:** `save()` 雙寫 — localStorage `aigro-mcp-signup`(Account.tsx 讀狀態)+
`captureWaitlist()` insert `waitlist`(kind='mcp', vertical=interests join, role=builder 類型)。
最快見效嘅真實數據收集,已上線。**下一步:** Account/admin 讀返 Supabase 名單狀態。

### 10. Uploads / 蒸餾 — `AdminStudio.tsx`【M–L】
**現狀:** file picker 純 UI state;studioExperts mock 有 prompt versions 同測試回答。
**換法:** Supabase Storage bucket `kb-uploads`(admin-only policy)→
Edge Function:download → chunk → embed → insert `expert_knowledge_base`
(`approved_by_expert` 預設 false,專家喺 PortalKB 批核 → 已經有對應 UI)。

### 11. Quota【M】
**現狀:** 全站無限;quota 只係 admin 展示數字。
**換法:** 先記後限:LLM/scraper call 一律寫 `usage_logs`(provider, cost_usd),
`api_quota_settings` 定上限,達標 alert。會員對話 quota(免費 vs founding)第二阶段。

### 12. Payments【M】
**現狀:** Pricing 純展示三層方案,CTA 去 /join,冇交易。
**換法:** Stripe Checkout(創始會員 one-time / 訂閱),webhook 寫 `subscriptions`
同更新 `profiles.tier`;member.ts 嘅 tier 已预留 `pro | vip`。

---

## 第一批 5 張表(即刻起得)

按 03-data-model.md 微調,夠支撐 quick wins + 情報 pipeline:

```sql
-- 1. profiles(auth.users 延伸,會員 4 級制度)
create table profiles (
  id uuid primary key references auth.users(id),
  name text,
  role text default 'free' check (role in ('free','founding','expert','admin')),
  tier text default 'free' check (tier in ('free','pro','vip')),
  persona text,
  interests text[],
  notifications jsonb default '{"daily":true,"weekly":true,"product":false}',
  created_at timestamptz default now()
);

-- 2. waitlist(MCP 報名 + 任何優先名單)
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  kind text default 'mcp',          -- 'mcp' / 'founding' / 'newsletter'
  interests text[],
  role text,
  created_at timestamptz default now(),
  unique (email, kind)
);

-- 3. conversations(Ask 對話)
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),  -- null = 訪客
  anon_id text,                          -- 訪客 claim 用
  expert_id uuid,                        -- null = 平台編輯部;之後 FK 去 experts
  started_at timestamptz default now()
);

-- 4. messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text check (role in ('user','assistant')),
  content text,
  sources jsonb,                         -- AiReply 引用,照存
  created_at timestamptz default now()
);

-- 5. items(情報主表 — 自家 pipeline 目標,同時可接 AIHOT import)
create table items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  local_commentary text,                 -- 香港視角長評
  source_url text,
  source_name text,
  category text,
  score numeric,
  status text default 'pending' check (status in ('pending','reviewed','published','rejected')),
  published_at timestamptz,
  fingerprint text unique,
  created_at timestamptz default now()
);
```

第 6–8 張(緊接):`experts`、`expert_knowledge_base`(pgvector)、`emails`。

---

## 即刻接得嘅(<1 日 quick wins)— v1.24 全部完成 ✅

1. **Auth** ✅(v1.24)— member.ts 接 Supabase Auth(email magic link)+ `profiles` 表,
   Login/Join/Account/Navbar/Access 全線即真(需 env);無 env 回落 demo。
2. **Waitlist 表** ✅(v1.24)— Developers.tsx MCP + Newsletter + Ask/About capture +
   interest.ts(expert/partner)全部經 `captureWaitlist()` 寫 `waitlist` 表,真實收集開始。
3. **Conversation logging** ✅(v1.24)— sessions.ts 寫入路徑加 fire-and-forget insert 去
   `conversations`/`messages`(讀取仍 localStorage 先行),對話數據即刻開始累積,
   之後 CRM leads 同專家統計有原料。

**點樣開:** 複製 `.env.example` 做 `.env.local`(已填好真 project),`npm run dev` 即行真 Supabase;
唔設 env → 全站 localStorage 示範模式。Schema 見 `supabase/schema.sql`(RLS 已開,anon 只能
insert waitlist / 讀寫自己 conversations+messages / 讀寫自己 profiles)。

---

*審計基準:v1.19 codebase(branch fix-19-demo)。日期:見 commit。*
