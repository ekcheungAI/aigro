# Distillation CMS、AI 導師聊天與真人預約實作狀態

更新：2026-08-10

## 現時結論

程式層已建立 20 位導師 onboarding、私有知識蒸餾、Persona Compiler、
grounded AI chat、導師 CRM、真人預約基礎，以及經導師同意的 TikTok／Instagram
公開資料同步。不過呢批新 migration、六個 Edge Functions、provider secrets、
Anonymous Auth 及第一位導師的 release dataset 尚未在 production 完整驗收，
所以相關 UI 必須維持 `Beta`／`Blocked`，不得聲稱已 live。

## 已在程式內接通

- 權限以受保護的 `account_access` 為準；`super_admin`、admin、expert、member
  分權，導師 workspace 以 immutable `expert_id` 隔離。
- 最多 20 個未封存導師 workspace；建立、邀請、接受、owner assignment、
  offboarding／restore 有資料庫 invariant 及 audit trail。
- CMS 支援 manual、HTTPS URL、private PDF、YouTube；revision、chunk、approval、
  publish、rollback、job retry 與 atomic worker completion 均落在資料庫。
- Persona Compiler 只使用 published revisions，release gate 綁定至少 25 條
  active evaluation questions 及完整 evaluation manifest。
- AI chat 由伺服器載入 history、鎖定 published persona、只檢索所選導師的
  published chunks、驗證引用 marker，並以 request id／message hash 原子保存。
- CRM lead、interaction、stage、note、follow-up 與統計全部按 `expert_id` 隔離；
  原始匿名問題跟 conversation／30 日 retention 一併清理。
- TikHub worker 只處理導師明確同意的公開 TikTok／Instagram 帳戶；不使用
  OAuth、creator cookie 或 private analytics，結果仍須經 CMS 審批先可進 chat。
- Booking 已有 availability、45 分鐘 slot、重疊 constraint、VIP entitlement、
  48 小時取消規則及通知函式基礎。

## Production 仍然欠缺

- 套用並驗證最新 `supabase/migrations/`；production 目前未有新 invitation／
  social schema，亦未部署 `invite-expert-owner`／`social-sync-worker`。
- 在 Supabase Auth 開啟 Anonymous Sign-ins，設定 Site URL、redirect allow-list、
  SMTP、leaked-password protection，並為 super admin 啟用 MFA。
- 設定 Edge secrets：MiniMax、OpenAI、Turnstile、Firecrawl、
  YouTubeTranscript.dev、Resend、TikHub，以及各 worker／webhook secret。
- 在 Vault 設定 `project_url`、`knowledge_worker_secret`、
  `persona_compiler_secret`、`booking_webhook_secret`、
  `social_sync_worker_secret`，並確認 Cron dispatch response。
- 每位準備上線的導師至少建立 25 條 verified questions、兩個 published
  knowledge sources、passed evaluation 及人工批准 persona；逐位開 feature flag。
- 以真實 provider 跑 manual／URL／PDF／YouTube、Cantonese ASR、引用、延遲、
  email deliverability、預約及 revoke-race smoke tests。

## 部署次序

1. 備份 production，先在乾淨 staging database 執行 `supabase db reset` 及 pgTAP。
2. 以不可變 migration deploy schema；已在任何環境套用過的 migration 不再改寫，
   修正一律放下一個 migration。
3. Deploy `ask-answer`、`knowledge-worker`、`persona-compiler`、
   `booking-notify`、`invite-expert-owner`、`social-sync-worker`。
4. 設定 Auth、Edge secrets、Vault 及 private Storage，再跑 production checker。
5. 先以 Elvin staging persona 通過 25 題／RAG release gate，再逐位啟用；
   未通過的導師只顯示資料頁及真人預約 Beta，不開 AI chat。

## 驗證指令

```bash
supabase db reset
npm run test:db
npm run test:functions
deno check supabase/functions/ask-answer/index.ts \
  supabase/functions/knowledge-worker/index.ts \
  supabase/functions/persona-compiler/index.ts \
  supabase/functions/booking-notify/index.ts \
  supabase/functions/invite-expert-owner/index.ts \
  supabase/functions/social-sync-worker/index.ts
deno lint supabase/functions
npm run lint
npm run test
npm run build
npm run test:e2e
npm run check:production -- --strict
```

付款、Google Calendar、Zoom 自動建立及真人即時 takeover 仍不在本階段範圍。
