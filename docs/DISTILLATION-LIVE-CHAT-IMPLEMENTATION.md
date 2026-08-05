# Distillation CMS、AI 導師聊天與真人預約實作狀態

更新：2026-08-05

## 已落地

- Supabase migrations：由 legacy baseline 到 JWT ownership、`account_access`、private knowledge、pgvector、persona versions、audit、knowledge gaps、availability 與 bookings。
- 匿名訪客使用 Supabase Anonymous Auth；conversation、message、lead 全部以 `auth.uid()` 做 owner。
- Portal CMS 支援 manual、URL、private PDF、YouTube，並提供 queue、處理預覽、審批、發佈、archive 與 rollback 資料模型。
- Durable distillation worker：content hash 去重、Firecrawl／YouTube transcript adapters、MiniMax structured distillation、overlap chunks、OpenAI 1536 維 embedding、三次 retry、即時 database trigger 加每分鐘 cron 補救。
- Expert chat：server-side history、published-revision-only retrieval、persona version、MiniMax SSE、實際 citations、coverage／answer basis、Turnstile、rate limit、idempotency，以及完整 chat round transaction。
- 真人預約：VIP 每月 entitlement、45 分鐘 slot、Postgres overlap constraint、48 小時取消限制、Portal 導師確認／拒絕／meeting link、Account 查閱及取消、Resend 通知。
- Admin Studio：逐導師 feature flags、persona 發佈、內容代審與 knowledge gap review。
- Persona Compiler：由至少兩個 published revisions 合成 mental models、decision heuristics、expression DNA、values、anti-patterns、tensions、honest boundaries 與 timeline；所有模型保留 evidence refs。
- Persona fidelity gate：獨立 probe generation／evaluation，總分至少 80，且 edge honesty ≥ 16/20、source transparency ≥ 12/15；通過後仍須導師或 Admin 人工批准先可發佈 immutable persona version。
- TypeScript database types：`src/types/database.ts` 由本機 migration schema 生成。

## 安全界線

- Browser 永遠只使用 publishable key；service key、provider keys、worker/webhook secrets 只放 Edge Function secrets。
- Raw source、revision、chunks 與 `expert-kb` bucket 不公開；RAG 只由 server service role 讀取。
- `profiles.role`／`profiles.tier` 只保留 legacy mirror；真正權限來自只准 admin/service role 修改的 `account_access`。
- `ask-answer` 必須有有效 JWT；production 設定 Turnstile secret 時，前端必須同時設定 site key。
- Admin 代批准、發佈、rollback 與 booking 狀態改動全部寫 audit event。
- 舊 `publish_persona_version` 已撤銷 browser execute 權限；UI 無法繞過 Persona Compiler、fidelity gate 或人工審批。
- Persona blueprint 只控制分析方法、取捨與表達；導師事實、立場與引用仍只可來自當次 published-only RAG context。

## Staging 部署清單

1. 備份 staging database，再以 Supabase migration deploy 套用 `supabase/migrations/`；不要直接執行舊 `schema.sql`。
2. 在 Auth 開啟 Anonymous Sign-ins，確認 Site URL 與 redirect allow-list。
3. 設定 Edge Function secrets：MiniMax、OpenAI、Firecrawl、YouTubeTranscript.dev、Turnstile、knowledge worker secret、persona compiler secret、Resend 與 booking webhook secret。
4. 在 Vault 加 `project_url`、`knowledge_worker_secret`、`persona_compiler_secret`、`booking_webhook_secret`，確保 pg_cron／pg_net 可以呼叫 deployed functions。
5. Deploy `ask-answer`、`knowledge-worker`、`persona-compiler`、`booking-notify`，並保持 `supabase/config.toml` 的 JWT 設定。
6. 設定 private Storage bucket policy，逐位導師先開 `cms_ingestion_enabled`；完成 Persona Compiler review 後開 `persona_compiler_enabled`，verified question evaluation 達標後再開 `rag_enabled`，最後開 `booking_enabled`。
7. 在 staging 實測 manual、URL、PDF、YouTube captions 與無字幕廣東話 ASR；provider API response 形狀有變時只修改 adapter。
8. 建立每位導師至少 25 條 verified evaluation questions；達到 release gate 後才 rollout。

## 仍需外部環境完成

- 沒有 staging／production provider secrets，因此本地無法執行真實 Firecrawl、YouTube ASR、OpenAI embedding、MiniMax model smoke test或 Resend deliverability test。
- 未連接 production，亦未 deploy、publish、改 production data 或開任何 feature flag。
- 付款、Google Calendar、Zoom 自動建立與真人即時 takeover 不在本階段範圍。
- 正式 release 前仍要跑 25 題／導師 evaluation，量度 recall@6、grounded citation accuracy、跨導師洩漏與 p95 latency。

## 驗證指令

```bash
npm run verify
npm run test:functions
npm run test:db
npm run test:e2e
deno check supabase/functions/ask-answer/index.ts \
  supabase/functions/knowledge-worker/index.ts \
  supabase/functions/persona-compiler/index.ts \
  supabase/functions/booking-notify/index.ts
```

本機 Supabase CLI 2.75.0 在 `db reset` 完成 schema 後，重啟 image proxy／pooler 偶爾回 502；Database、REST、Studio 均保持健康，pgTAP 可正常連線。升級 CLI 後應重新確認該 container health-check warning。
