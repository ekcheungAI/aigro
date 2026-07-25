# QueryState(F7)

`src/components/QueryState.tsx` — 接 Supabase 前嘅統一 async 三態腳手架(loading skeleton / error retry / empty)。
用法:`<QueryState loading={q.isPending} error={q.error ? "載入失敗,請重試。" : null} empty={rows.length === 0 ? <Empty/> : null} retry={q.refetch}>{內容}</QueryState>`。
優先次序:loading → error → empty → children;`empty` 喺數據非空時傳 `null`。
Loading 態係 token-based pulse rows(`bg-accent animate-pulse`,無 shimmer gradient);error 態係 inline card + 重試掣。
而家全站數據係 sync import — 參考 exemplar:`src/pages/Account.tsx` 用量統計 row(loading 恆 false);接 DB 時逐頁將 `loading`/`error`/`retry` 駁去真 query。
