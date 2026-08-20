# MiniMax-M3 integration

AIGRO 嘅生成式回答統一經 Supabase Edge Function `ask-answer` 呼叫
`MiniMax-M3`。Browser bundle 唔包含 MiniMax API key、base URL 或 system prompt。

## Runtime flow

1. Browser 先以 Supabase Anonymous Auth 取得真實 user JWT，建立由該 user
   擁有嘅 conversation。
2. `src/lib/llmFallback.ts` 連同 JWT、Turnstile token 同 request id 呼叫
   Supabase `ask-answer`。
3. Function 核對 origin、JWT、conversation owner、導師 release gate、配額同
   Turnstile，再載入 server-side history、published persona 同已授權 RAG chunks。
4. Function 加入 server-side persona prompt，再呼叫
   `POST https://api.minimax.io/v1/chat/completions`，model 固定預設為
   `MiniMax-M3`。
5. Grounding gate 通過後，答案、引用、CRM interaction 同 knowledge gap 會喺
   同一個 database transaction 保存。

`supabase/config.toml` 對 `ask-answer` 必須保持 `verify_jwt = true`。Publishable
key 只識別 Supabase project，唔代表使用者身份；每個 chat request 另外帶有
Anonymous Auth 或正式會員 JWT，Function 再核對 `auth.uid()` ownership。唔可以
為方便 browser 直連而 deploy 成 `verify_jwt=false`。

## Deploy

先喺 Supabase SQL Editor 套用 `supabase/v4-minimax.sql`，再設定 secrets：

```sh
supabase secrets set \
  MINIMAX_API_KEY=... \
  MINIMAX_BASE_URL=https://api.minimax.io/v1 \
  MINIMAX_MODEL=MiniMax-M3 \
  ALLOWED_ORIGINS=https://aigro.io,https://www.aigro.io,https://aigro-blue.vercel.app,http://localhost:3000
```

然後 deploy：

```sh
supabase functions deploy ask-answer
```

真實值只可以輸入 Supabase secrets；唔好寫入 `.env.example`、GitHub source、
Vercel `VITE_*` variables 或 browser code。

## Verification

- `deno check supabase/functions/ask-answer/index.ts`
- `npm run build`
- 喺隔離 beta 環境，用真實 Anonymous Auth JWT、Turnstile 同已發布測試 corpus
  提交問題，確認 SSE、引用、messages、quota 同 CRM side effects 全部成功。
- 搜尋 production JS bundle，確認冇 `MINIMAX_API_KEY` 或 bearer credential。

目前 Argro 新聞抓取係獨立 Zeabur backend。本 repo 已確保網站生成式回答只用
MiniMax-M3；如果要新聞分類／摘要同樣轉 M3，需要喺 Argro backend 另行更換 provider。
