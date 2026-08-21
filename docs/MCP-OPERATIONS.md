# AIGRO AI 情報 MCP — 接入與營運手冊

公開 Beta endpoint：`https://aigro.io/api/mcp`

呢個 Streamable HTTP MCP 同 `/insights` 共用策展快照及已發佈資料。公開層
只讀，毋須 API key；每項結果固定標示 `language: zh-HK`，並保留來源原文
`original_url`、策展頁 `canonical_url`、`attribution` 同發佈時間。英文、非 AI、
過期或資料不完整嘅項目會喺同步及讀取兩層被拒絕。

## 客戶端設定

任何支援遠端 MCP URL 嘅客戶端都可以使用以下設定：

```json
{
  "mcpServers": {
    "aigro": {
      "url": "https://aigro.io/api/mcp"
    }
  }
}
```

現時提供四個只讀工具：

| 工具 | 用途 | 主要限制 |
| --- | --- | --- |
| `get_latest_news` | 按發佈時間取得最新 AI 情報 | `limit` 1–50 |
| `search_news` | 搜尋標題及摘要 | query 2–120 字；`limit` 1–50 |
| `get_article_detail` | 按文章 ID 取得來源證據 | ID 1–120 字 |
| `get_daily_brief` | 取得同一香港日期嘅每日重點 | `limit` 1–12 |

所有工具同時回傳 MCP `structuredContent` 同文字 JSON fallback，並有穩定
`outputSchema`。標題上限 300 字、摘要上限 1,200 字；最新列表每個來源最多
三則，避免單一媒體霸榜。分頁使用 `published_at` 游標，避免 offset 漂移。

## Production smoke

```sh
npm run check:mcp
```

檢查會：

1. 驗證 HTTPS、initialize、tools/list 同四個 output schema；
2. 確認惡意 `Origin` 回傳 403；
3. 真實呼叫 `get_latest_news`，檢查全繁體字形、來源、原文、canonical 連結、
   attribution、摘要上限同時間；
4. 確認最新項目不超過 180 分鐘（可用 `MCP_MAX_AGE_MINUTES` 調整）。

如將來改為私人部署，可設定 `AIGRO_MCP_BEARER_TOKEN`，並用：

```sh
MCP_EXPECT_AUTH=true MCP_TOKEN="$MCP_TOKEN" npm run check:mcp
```

Token 只可放 CI secret 或伺服器環境變數，唔可以進入 browser bundle、URL、
issue 或 fixture。

## 安全與資料邊界

- 公開 MCP 合併版本控制內嘅策展快照，以及 Supabase `status=published`、
  `lang=zh-HK` 嘅公開欄位；策展版本優先去重，資料庫失效時亦可安全降級。
  Service key、未發佈內容、來源憑證同內部 connector 設定永不出現在 response。
- Browser `Origin` 使用 allow-list；一般 CLI/agent client 唔會帶 `Origin`，因此
  保留無 Origin 接入。Host 亦經 allow-list 驗證。
- 所有 limit 有上下限；搜尋字串會 escape 後先進入 PostgREST filter。
- `npm run check:news` 會攔截過期、英文、非 AI、缺摘要／來源及單一來源壟斷。
- 舊 `argro-mcp.zeabur.app/mcp` 唔再係產品 endpoint；停用前只可視為相容性
  遺留服務。任何公開文件同客戶端設定一律使用 `aigro.io/api/mcp`。

## 加入新資料來源／新 MCP

1. 先建立 source contract：授權、canonical URL、語言、更新頻率、錯誤率同
   rollback owner。
2. Connector URL、auth reference 同 parser version 放 server-side 私有設定；
   browser-readable `sources` row 只負責顯示同 attribution。
3. 先以 pending/canary 模式同步，通過 relevance、zh-HK、完整度、重複及
   freshness gate，先可以自動發佈。
4. 新 MCP 必須加入版本控制、鎖檔、協議測試、Origin 測試、output schema、
   semantic health check 同 production rollback。
5. 推出後以 `npm run check:news`、`npm run check:mcp` 同瀏覽器 QA 作 release
   evidence，唔可以只靠 process health 200。
