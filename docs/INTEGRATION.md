# INTEGRATION.md — Mock vs Supabase-Ready 審計

> v1.19 全站接入審計。誠實記錄而家邊啲係 MOCK(localStorage / 靜態 TS 數據)、
> 邊啲已經 SUPABASE-READY(換一個 module 就上得線),同埋每區嘅接入點同工作量。
> Schema 參考:`/mnt/agents/output/hk-ai-platform/docs/03-data-model.md`(pgvector-ready),
> 路線圖:`docs/ROADMAP.md` Phase 1–2。

現狀總結:**全站零後端**。所有「帳號」係 localStorage JSON,所有內容係 `src/data/*.ts`
靜態 export 或 AIHOT snapshot JSON。好處係全部 mock 都集中喺 3 個位置
(`components/auth/member.ts`、`components/ask/sessions.ts`、`src/data/*`),
接 Supabase 時 consumer 頁面基本唔使改。

---

## 總表

| 功能 | 位置 | 現狀 | Supabase 接入點 | 工作量 |
|---|---|---|---|---|
| Auth / 會員 | `src/components/auth/member.ts` | MOCK — localStorage `aigro-member`,4 級 role 已定型 | 換 `loadMember/saveMember/clearMember` 做 `supabase.auth` + `profiles` 表;consumer(Navbar/Login/Join/Account/PortalLayout/AdminLayout/Access)唔使改 | **S** |
| Ask 對話 sessions | `src/components/ask/sessions.ts` | MOCK — localStorage `aigro-ask-sessions-v1` | `conversations` + `messages` 表;sessions.ts 換 async repo,Ask.tsx 已經係單一入口 | **S–M** |
| Ask personas( scripted 回答) | `src/data/personas.ts` + `demoPersonas.ts` | MOCK — keyword regex → scripted reply | RAG:LLM + pgvector 檢索 `expert_knowledge_base`;personas.ts 保留做語氣 system prompt 同 fallback | **L** |
| 情報數據 | `src/data/aihot.ts` + `aihot-snapshot.json`、`insights.ts` | SEMI-MOCK — 真 AIHOT API snapshot(build 時 fetch),自家 pipeline 未起 | 自家 scraper(sources→fetch→dedupe→score)寫入 `items` 表;aihot.ts 介面已係 typed adapter,換 data source 即接 | **M** |
| 專家目錄 | `src/data/experts.ts` | MOCK — 靜態 2 位專家 | `experts` 表;ExpertProfile/Experts 頁經 data module 讀,換 query 即接 | **S** |
| 專家平台數據 | `src/data/portal-mock.ts` | MOCK — 按 slug 寫死嘅 stats/conversations/insights/socials | `experts` / `expert_insights` / `conversations` 表 + RLS(專家只見自己);`expertSlugForEmail()` 換 auth user ↔ expert join | **M** |
| Admin 後台數據 | `src/data/admin-mock.ts` + `admin-mock2.ts` | MOCK — KPI、members、content queue、studio、expert 360 全部寫死 | 全部係上面各表嘅 **admin RLS views / 聚合 query**;唔需要新 table,需要 policies + views | **M** |
| CRM leads | `admin-mock.ts` `crmLeads` | MOCK — 靜態 lead 列表 | `leads` 表:由 conversation events(高意圖訊息、預約 click)自動生成;AdminCRM + PortalLeads 共用 | **M** |
| Emails | `admin-mock2.ts` `emailContacts`、Account notifications、`components/Newsletter.tsx`、ExpertProfile subscribe | MOCK — 訂閱狀態全部前端 state | `emails` 表(email, segment, status, source);waitlist/member/newsletter 三個入口統一寫入,admin 讀聚合 | **S** |
| MCP 報名 | `src/pages/Developers.tsx` localStorage `aigro-mcp-signup` | MOCK — `{email, interests, role, ts}` 單機 JSON | `waitlist` 表;`save()` 一個 function 換 insert,Account.tsx 讀返名單狀態 | **S** |
| Uploads(Studio 蒸餾) | `src/pages/admin/AdminStudio.tsx` file picker | MOCK — 揀咗 file 只係 UI state,冇上傳 | Supabase Storage bucket `kb-uploads` + distillation Edge Function(chunk→embed→`expert_knowledge_base`) | **M–L** |
| Quota / 用量 | `admin-mock2.ts` `homepageQuota`、`PORTAL_INSIGHT_QUOTA = 3` | MOCK — 而家全站無限,quota 係展示用 | `usage_logs` + `api_quota_settings` 表;先記錄後執行,會員對話 quota 之後先上 | **M** |
| Payments | `src/pages/Pricing.tsx` | MOCK — 純展示,CTA 去 /join | Stripe Checkout + `subscriptions` 表;webhook 更新 `profiles.tier`。展示層唔使改 | **M** |

---

## 分區詳情

### 1. Auth / 會員 — `src/components/auth/member.ts`【S】
**現狀:** `AigroMember`(name/email/role/tier/persona/notifications)存 localStorage。
4 級制度 `MemberRole = free | founding | expert | admin` 已貫穿全站
(Navbar 頭像、Login 示範帳號、PortalLayout / AdminLayout gate、Access 頁)。
**換法(module 內 3 個 function,consumer 零改動):**
- `loadMember()` → `supabase.auth.getSession()` + `profiles` select
- `saveMember()` → signUp / profile upsert
- `clearMember()` → `supabase.auth.signOut()`
- 額外:session listener(`onAuthStateChange`)broadcast 俾 Navbar 重讀。

### 2. Ask sessions — `src/components/ask/sessions.ts`【S–M】
**現狀:** `ChatSession[]`(id、persona key、messages、updatedAt)存
`aigro-ask-sessions-v1`;有 legacy key 遷移邏輯,已係乾淨嘅 repo pattern。
**換法:** 同介面換 async implementation:
`conversations`(user_id, expert_id, started_at)+ `messages`(conversation_id, role, content, created_at)。
訪客對話可先寫 `user_id = null` + anon id,登入後 claim。

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

### 8. Emails — 三入口【S】
**現狀:** Newsletter band(`components/Newsletter.tsx`)、ExpertProfile subscribe、
Account notification toggles、`emailContacts` mock — 各散沙,冇持久化。
**換法:** 單一 `emails` 表(email, segment, status active/unsubscribed,
source waitlist/member/newsletter, created_at),三個入口統一 upsert;
`admin-mock2.ts` 嘅 segment summary / engagement 變聚合 view。

### 9. MCP 報名 — `src/pages/Developers.tsx`【S】
**現狀:** `aigro-mcp-signup` localStorage 一條 JSON;Account.tsx 只 check 存在。
**換法:** `waitlist` 表(email, interests text[], role, ts);`save()` 換 insert,
登入後預填 email。呢個係最快見效嘅真實數據收集。

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

## 即刻接得嘅(<1 日 quick wins)

1. **Auth** — member.ts 3 個 function 換 Supabase Auth(email magic link 已夠),
   `profiles` 表一開,Login/Join/Account/Navbar/Access 全線即真。【S】
2. **Waitlist 表** — Developers.tsx `save()` 一個 insert,
   MCP 報名即刻變真實收集;Account 名單狀態同 admin 即刻有數睇。【S】
3. **Conversation logging** — sessions.ts 寫入路徑加 fire-and-forget insert 去
   `conversations`/`messages`(讀取仍可 localStorage 先行),對話數據即刻開始累積,
   之後 CRM leads 同專家統計有原料。【S】

---

*審計基準:v1.19 codebase(branch fix-19-demo)。日期:見 commit。*
