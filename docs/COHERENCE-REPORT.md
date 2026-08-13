# COHERENCE-REPORT.md — 系統性連貫審查(接 DB 前)

> 日期:2026-07-25 · 基準:master @ e3f997a · 方法:全站 grep 一致性掃描 + runtime-audit + MCP 故事線逐點對照。
> 目的:確保所有「故事」喺每個接觸點講嘅係同一件事 — 接 DB 前唔會有矛盾爆出嚟。

---

## A. 故事一致性

### A1. MCP 故事線(優先審查)
| 接觸點 | 講咩 | 一致? |
|---|---|---|
| Home MCP band | 「AI — 優先名單開放中 · Beauty・Technology — 規劃中」 | ✅ |
| /developers | AI 優先名單 + Beauty/Tech 規劃中 + 行業投票 + endpoint「即將開放」badge | ✅(v1.22 修咗 404 假 live) |
| /data | 自家 pipeline 4 步 + 3 伙伴 + roadmap 表(AI LIVE → Beauty Q3 → Finance Q4) | ✅ |
| Footer Developers | 「MCP Network 優先名單」+ Data 合作 link | ✅ |
| /skills AIGRO 情報 Skill | 「優先名單開放中」→ /developers | ✅ |
| AdminSettings | 行業 toggle(AI 開 / 其他未開放)+ 來源健康 | ✅ mock 註明 |
| AdminMembers / Emails | waitlist 412/203/187(mock 標記) | ✅ 一致標記 mock |
| Insights sectors | AI LIVE + 6 行業「情報即將推出」→ /developers | ✅ |

**結論:MCP 故事而家全站統一 — 「AI 先行、行業擴展、優先名單制」。無矛盾。**

### A2. 專家故事
| 事實 | 一致? |
|---|---|
| Jimmy = 劉泰麟 · DotAI 共同創辦人 & CMO | ✅ 全站統一(Experts/Profile/Ask/Portal/Admin) |
| Elvin = @ekcheungAI 創辦人 · SuperBash 主理人 | ✅ |
| Prompt v1.0 已上線 · v1.1 待審批 | ✅ Portal/Admin/ContextPanel 一致 |
| 10 個核心觀點 | ✅ viewpoints.length 動態讀取 |
| 成就數據(200+ 大會等) | ✅ 冇發明數字,全部來自真 scrape |

### A3. 會員故事
| 事實 | 一致? |
|---|---|
| 創始會員 HK$168 · VIP HK$988 | ✅ Pricing/Join 一致 |
| 4 級角色(free/founding/expert/admin) | ✅ member.ts 單一來源,Account/Navbar/Access 一致 |
| 無限對話 · 限時開放 | ✅ Ask/Pricing/QuotaMeter 一致 |

### A4. 情報故事
| 事實 | 一致? | 備註 |
|---|---|---|
| 「147 則本週動態」 | ⚠️ 可接受 | Home stats 用 aihotAllInsights(147),feed 預設顯示精選 50 — 文案分別係「本週動態」vs「精選」,邏輯成立但建議接 DB 後統一 |
| 更新日期 2026-07-23 | ⚠️ 留意 | Snapshot 係 07-23,網站「今日」係動態日期 — 接自家 scraper 後自然解決 |
| **AIHOT 可見度** | ✅ 已修(e3f997a) | 速覽 → originalUrl;ticker → 內部主題地圖;credit line 全清 |

### 修正記錄
- `e3f997a`:Home 速覽連結 → `originalUrl ?? permalink`;HotTopicsTicker → `/insights?tab=topics`(內部)。AIHOT 域名再無喺 UI 出現。

---

## B. Output 品質評級
| Output | 評級 | 備註 |
|---|---|---|
| OG image(黑底綠字 AIGRO.) | A | 品牌一致 |
| Sitemap(25 URLs 絕對路徑) | A | 自動生成 script 有 |
| Daily 日報刊頭 | A | 報紙式,動態期號 |
| Ask 分身回答(廣東話) | B+ | 已接 MiniMax-M3；本地 KB direct reply + server-side general fallback |
| Signup/Join 流程 | A | 3 步清晰,success 狀態靚 |
| Account 檔案完成度 | A | 進度條 + milestones 解鎖 |
| CRM follow-up email 模板 | B | 可用但平 — 接 DB 後值得執靚 |
| 專家投稿編輯器輸出 | B+ | 結構好,max-3 合理 |
| Newsletter 成功態 | A- | 簡潔;接 Resend 後先真係有用 |

---

## C. 接 DB 前優先清單(已完成 ✅ / 待 DB ⏳)
1. ✅ AIHOT 全面隱藏(e3f997a)
2. ✅ Library 孤兒清除、sitemap、OG、死制、假數字、假連結、假 endpoint
3. ⏳ 前端 → 後台數據流(portal 投稿 → admin queue) — 等 Supabase
4. ⏳ 147 vs 50 計數統一 — 等自家 items 表
5. ⏳ CRM email 模板執靚 — 等真發送
6. ⏳ Semantic search(目前 substring)— 等 pgvector
