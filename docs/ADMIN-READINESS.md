# ADMIN-READINESS.md — /admin 後台就緒審計(v1.20)

> 目標:成個 /admin 後台無死角 — 無死制、數字跨頁一致、連結全部解到、
> build 乾淨、每個數據來源係單一 typed module,可以無縫換 Supabase。
> 審計基準:branch `fix-20-adminqa`(master @ ea0fb0f 起)。方法:`tsc + vite build`
> + 逐頁 code review + `vite dev` 實機巡全部 9 條路由並抽驗互動。

---

## 總結

- **Build / 型別:** `npm run build`(tsc -b && vite build)✅ 零 error。
- **Runtime:** 9 條 admin 路由全部 render 正常,dev log 無錯誤,頁面無 crash。
- **死制:** 0 個。全部 button/toggle/drawer 都係「改 local state + 可見反饋」或 toast
  (grep 全區無 `href="#"`、`console.log`-only、空 onClick、alert)。
- **數據矛盾:** 13 處全部修復(見下表),修復方式以「由 canonical mock 衍生」為主,
  唔係齋改數字 — 衍生邏輯本身就係日後 Supabase 聚合 view 嘅 spec。
- **路由缺口:** `/admin/skills` 冇 route 冇頁面(見「阻塞點」#1,需 main agent 喺 App.tsx 接線)。

---

## 逐頁檢查清單

### /admin(Dashboard)— `src/pages/admin/Dashboard.tsx`
- 控制:4 張 KPI 卡(展示)、本週對話圖(展示)、最近活動(展示)、4 個快速進入 link ✅ 全部去正確路由。
- 數據:【已修】「今日情報」注腳 4 條待審核 → 衍生自 `contentQueue`(=7);「平均信心 0.81」→ 衍生自 `conversations`(=0.80);快速進入描述全部衍生(待審核 7、專家草稿 2、已標記 2、MCP AI 412、2 席草稿)。
- 來源:`admin-mock.ts` + `experts.ts`(verified/pending 計數)。✅

### /admin/experts — `src/pages/admin/AdminExperts.tsx`
- 控制:邀請專家(toast)、行點擊/編輯開 drawer、7 個 tab、雷達 slider、特質 chips 增刪、重新蒸餾(toast)、Verified toggle、儲存/取消 ✅(實機驗證 drawer + tab + 儲存 toast)。
- 數據:【已修】「數據 Data」tab 全部衍生 — 對話/信心/7 日趨勢←`portal-mock.portalStats`;社交←`portalSocials`(只計已連接,handle 同 `experts.ts` 一致);KB chunks←`admin-mock.studioExperts`;情報已發佈/投稿←`portalInsights + expertSubmissions`。
- 來源:experts.ts + admin-mock + admin-mock2(3 個 module,衍生後數字一致)。⚠️「知識庫」tab 嘅 公開分享 12 / 授權訪談 3 係寫死嘅敘事數字,無跨頁對應,保留。
- 備註:2 位 verified + 2 席草稿,同 Dashboard 一致 ✅。

### /admin/studio — `src/pages/admin/AdminStudio.tsx`
- 控制:拖放/撳嚟上載、連結加入(模擬抓取 2.2s 轉態)、資源 tab/搜尋/全選/批次入庫/批次刪除、每行 KB toggle、開始蒸餾(進度條 + 步驟狀態機)、審批 toggle、測試分身(建議問題 + 自由輸入 + 清除)✅ 全部有 state + toast。
- 數據:【已修】collectedCount 12/9 → 11/10(同 resources.length 一致);【已修】測試分身開場白「Prompt Prompt v1.0」重複字 → 修正。
- 來源:`admin-mock.ts`(studioExperts)單一來源 ✅。kbChunks 1284/968 而家同 AdminExperts 數據 tab、portal 總覽一致。

### /admin/crm — `src/pages/admin/AdminCRM.tsx`
- 控制:階段 filter pills、列點擊開 360 drawer、接受建議(實機驗證:#A4821 新線索→已接觸,pill 計數即時更新)、移至階段、記低跟進、發送跟進 Email(composer 預填 + 發送記 timeline)✅。
- 數據:KPI 342/28/41/15 係全站 mock,頁尾已標明「顯示樣本 15 · 全站 342」,唔構成矛盾。
- 來源:`admin-mock.ts`(crmKpis + crmLeads)✅。member 快照同 members 表 email 一致(已連帶修正 emailContacts)。

### /admin/content — `src/pages/admin/AdminContent.tsx`
- 控制:3 大 tab、佇列/專家投稿 sub-tab、checkbox 批次通過/拒絕、單條通過/拒絕/精選、顯示位置(首頁/日報/普通)、投稿核准/退回(需填備註)/下架、新增/編輯文章 drawer、案例精選 toggle ✅(實機驗證通過 1 條,badge 10→9)。
- 數據:tab badge = 佇列待審 7 + 投稿待審 3 = 10,同 Dashboard 待審核內容 7(佇列部分)一致 ✅。
- 來源:admin-mock + admin-mock2 ✅。

### /admin/engagement — `src/pages/admin/AdminEngagement.tsx`
- 控制:全部/低信心/已標記 filter、列點擊開對話 thread、標記 toggle、匯出(toast)、加入知識庫(toast)✅。
- 數據:【已修】「今日對話 96」寫死 → `dashboardKpis.todayChats`;平均信心 0.80 由 conversations 即算,同 Dashboard 一致 ✅。
- 來源:`admin-mock.ts` ✅。

### /admin/members — `src/pages/admin/AdminMembers.tsx`
- 控制:搜尋、層級 filter、列點擊開 360 drawer、調整層級(cycle)、停用/恢復 ✅ 全部 state + toast。
- 數據:【已修】「全站 1,284 人」寫死 → `dashboardKpis.totalMembers`;MCP 名單 412/203/187 同 Settings、Emails、Dashboard 一致 ✅。
- 來源:`admin-mock.ts` ✅。

### /admin/emails — `src/pages/admin/AdminEmails.tsx`
- 控制:匯出 CSV(toast 示範模式)、搜尋、segment filter ✅。
- 數據:【已修】segment summary 改為衍生(members←dashboardKpis、MCP←mcpVerticals,總數 802 自動計);【已修】兩個同 members/crmLeads 撞名但 email 唔同嘅 contact 已對齊(見矛盾表 #10)。
- 來源:`admin-mock2.ts` ✅。

### /admin/settings — `src/pages/admin/AdminSettings.tsx`
- 控制:MCP 行業 toggle ×3(toast 含名單人數)、無限額度 toggle(聯動停用 tokens input)、tokens input、AIHOT 重新整理(spinner + toast)✅。
- 數據:MCP 名單 412/203/187 同源(mcpVerticals)✅;AIHOT 來源 items 3+2+6+4=15 = Dashboard 今日情報 15 ✅。
- 來源:`admin-mock.ts` ✅。備註:quota 預設 6551 tokens 係孤立 mock 數字(見阻塞點 #5)。

### /admin/skills — ❌ 路由唔存在
- App.tsx 冇 `admin/skills` route,sidebar 冇 Skills 項,`src/pages/admin/` 冇 AdminSkills.tsx;
  而家去 /admin/skills 會跌落公開站 404。**已報 main agent 接線**(App.tsx 唔喺我 scope)。

---

## 矛盾 / 修復對照表

| # | 位置 | 問題 | 修法 |
|---|------|------|------|
| 1 | Dashboard.tsx | 今日情報注腳「4 條待審核」 vs contentQueue 實際 7 條(同頁 待審核內容 KPI 都係 7) | 改為由 `contentQueue` filter 衍生 → 7 |
| 2 | Dashboard.tsx | 今日對話注腳「平均信心 0.81」 vs Engagement 頁計出 0.80 | 兩邊統一由 `conversations` 衍生 → 0.80 |
| 3 | AdminEngagement.tsx:62 | 「今日對話 96」寫死 | 改用 `dashboardKpis.todayChats` |
| 4 | AdminMembers.tsx:94 | 「全站 1,284 人」寫死 | 改用 `dashboardKpis.totalMembers` |
| 5 | admin-mock.ts studioExperts | collectedCount Jimmy 12 / Elvin 9 vs resources 實際 11 / 10 項(Studio 步驟 1 同資源庫互甩) | 改為 11 / 10 |
| 6 | admin-mock2.ts expertStatsBySlug | KB chunks 342/128 vs Studio + portal 總覽嘅 1284/968 | 衍生自 `studioExperts.kbChunks` → 1284/968 |
| 7 | admin-mock2.ts expertStatsBySlug | 分身對話 1284/86/91% 同 412/34/88% vs portalStats 1847/126/0.83 同 1293/98/0.86(同一專家兩套數;1284 仲撞咗總會員數、412 撞咗 MCP 名單) | 衍生自 `portal-mock.portalStats`(weeklyBars 按 一→日 重排,信心 ×100) |
| 8 | admin-mock2.ts expertStatsBySlug | 社交 handle/追蹤數(@jimmylau.hk 18.2K、LinkedIn 9.4K、YouTube 3.1K;@elvin.builds 1.2K)同 experts.ts + portalSocials 完全唔同(@jimmylau.ai、jimmy-lau-hk、@DotAI香港 12.4K;@ekcheungai) | 衍生自 `portalSocials`(只計 connected,followers 用 reach) |
| 9 | admin-mock2.ts expertStatsBySlug | Elvin 情報「已發佈/投稿 1/1」 vs portalInsights(1 發佈 / 2 篇)+ expertSubmissions(1 待審) | 衍生:已發佈←portalInsights,投稿←portalInsights + 待審 submissions(Jimmy 2/4、Elvin 1/3) |
| 10 | admin-mock2.ts emailContacts | tszlong.wong**@gmail.com**、kayan.**chan**@outlook.com(2026-01-03)vs members/crmLeads 嘅 tszlong.wong@**outlook.com**、kayan.**chen**@gmail.com(2026-07-08) | email + 加入日對齊 members 表 |
| 11 | AdminLayout.tsx:125 | 側欄版本「v1.13」過時 | → v1.20 |
| 12 | AdminStudio.tsx:798 | 測試分身開場白「(Prompt Prompt v1.0)」重複字 | 移除硬編 "Prompt " 前綴 |
| 13 | Dashboard.tsx QUICK_LINKS | 描述數字(7 條/2 篇/2 段/412 人/2 席)全部寫死 | 全部衍生(contentQueue、expertPosts、conversations、mcpVerticals、experts.ts) |

### 觀察(唔算矛盾,唔改)
- `crmKpis`(342/28/41/15)係全站 mock,CRM 頁尾已如實標明「顯示樣本 15 · 全站 342」。
- `portal-mock` 嘅 pi-e2(Elvin · Veo 4 · 待審核)喺 portal 佇列但唔喺 admin `expertSubmissions` 佇列 — 兩邊審核 queue 嘅 mock 樣本唔同;投稿總數衍生已正確反映。
- `expertActivityBySlug` 嘅創始會員名(陳嘉怡/吳日言/林子聰/何凱婷/張曉彤)唔喺 members 樣本表 — feed 係敘事樣本。
- AdminExperts「知識庫」tab 公開分享 12 / 授權訪談 3 係寫死敘事數字,無跨頁對應。

---

## Connector seams(Supabase 接入點現狀)

| Admin 頁 | 數據 module | 換法 |
|---|---|---|
| Dashboard | `admin-mock.ts`(+experts.ts 計數) | KPI/activity 換聚合 view;consumer 唔使改 |
| AdminExperts | `experts.ts` + `admin-mock.ts`(crmLeads)+ `admin-mock2.ts`(360 stats) | `experts` 表 + `admin_expert_360` view;**deriveExpertStats() 就係 view spec** |
| AdminStudio | `admin-mock.ts`(studioExperts) | `expert_knowledge_base` + Storage bucket `kb-uploads` + 蒸餾 Edge Function |
| AdminCRM | `admin-mock.ts`(crmKpis/crmLeads) | `leads` 表 + 聚合;寫入係 `leads.stage`/timeline insert |
| AdminContent | `admin-mock.ts`(queue/posts/cases)+ `admin-mock2.ts`(submissions/quota) | `items.status`、`expert_insights.status` update |
| AdminEngagement | `admin-mock.ts`(conversations) | `conversations`+`messages` 表 join 信心分 |
| AdminMembers | `admin-mock.ts`(members/mcpVerticals) | `profiles` 表 + `waitlist` 聚合 |
| AdminEmails | `admin-mock2.ts`(emailContacts/summary) | `emails` 表 + segment 聚合 view |
| AdminSettings | `admin-mock.ts`(mcpVerticals/aihotSources) | `api_quota_settings` + `sources` 表 |

無任何 admin 頁直接讀 localStorage 或 fetch;所有數據經上述 4 個 typed module,
swap point 乾淨。admin-mock2 而家會由 admin-mock / portal-mock 衍生 — 接入時
呢啲衍生改由 DB view 做,module 介面保持不變。

---

## 「Supabase 接入阻塞點」清單

1. **`/admin/skills` 路由缺失(需 main agent)** — 無 route、無 nav 項、無 AdminSkills.tsx;
   公開 Skills 頁嘅 CURATED 數據仲係頁面內聯,冇 `src/data/skills.ts` module。
   若 admin 要管 skills,需:建 data module → 建 AdminSkills.tsx → App.tsx 接 route + AdminLayout 加 nav(App.tsx 唔喺本審計 scope,已上報)。
2. **AdminStudio 上載純 UI** — 揀咗檔案只係 state,冇真正上傳。需要 Storage bucket
   `kb-uploads` + 蒸餾 Edge Function(詳見 INTEGRATION.md §10)。UI/狀態機已就緒。
3. **所有 admin 寫入係 in-memory state** — 轉頁/refresh 即重置。屬預期(pre-Supabase),
   但要留意:接 Supabase 時每頁嘅 `useState(mockX)` 要換成 query + optimistic mutation,
   toast 文案入面嘅「(mock)」要清走。
4. **`crmKpis` 係獨立 literal** — 同 crmLeads 無衍生關係(全站統計 vs 樣本)。接入時
   直接由 `leads` 表聚合取代,唔好嘗試喺前端夾。
5. **孤立 mock 數字** — Settings 嘅 6551 tokens 每日額度、Content 嘅 homepageQuota 2/2、
   Emails 嘅 newsletter 2341 / expertNotify 96:全部無第二來源可對照,接入時要有
   `api_quota_settings` / 首頁排版設定 / `emails` 聚合先填到真數。

除以上 5 點,無其他阻塞 — 死制 0、矛盾 0、404 link 0、build error 0。

---

*審計:v1.20(branch fix-20-adminqa)。驗證:`npm run build` ✅、`vite dev` 全 9 頁巡檢 ✅、
CRM/Content/Experts 互動抽驗 ✅。*
