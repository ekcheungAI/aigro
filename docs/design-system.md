# AIGRO — Global Design Document

> **AIGRO** (AI + Growth) — 香港最值得信賴的 AI・增長・商業情報平台。
> MasterClass 高端質感 × Indie Hackers 數據文化 × Intro.co 專家預約。
> 本文件是全域設計系統：色彩、字體、間距、動效、共用元件、頁面清單、資產清單。
> 實作 token 以 `src/index.css` 為唯一 source of truth；本文件必須與之同步。官方三點 logo 為不可變品牌資產，產品互動色則由獨立 UI token 管理。

---

## 1. Brand Foundation

### 1.1 定位

**Formal + Luxury, trustworthy.** AIGRO 的核心承諾：「這裡的每一位導師都經過認證，這裡的每一篇內容都值得信任」。視覺語言是**出版物 (publication) 而非產品 (product)**：海報式構圖、紀律化排版、單一強調色。絕不能像 generic SaaS 模板。

### 1.2 品牌識別

- **官方 logo**: 使用 `public/brand/aigro-wordmark-navy-transparent.png` 與 `public/brand/aigro-wordmark-white-transparent.png`。三點（個人／AI 知識／增長機會）的位置、比例與 navy／blue／green 顏色均不可重畫、改色或拆開重組。
- **品牌色彩方向**: cool paper + deep navy + brand green。Logo 內的 blue 與 green 只屬於不可變 artwork；產品按鈕、連結、active 狀態只用一套獨立 brand-green interaction token。互動填充一律「green 底 + deep navy 字」。
- **幾何圖案系統**: 45° 對角硬邊條紋（`.stripe-block`）與箭頭 chevron 帶（`.chevron-strip`）——blocky confidence 的品牌肌理。**全部是 hard-stop pattern，不是漸層**；每頁最多 ~3 個條紋時刻（hero 右緣條紋板、section chevron 分隔帶、footer 頂部細條紋帶），低透明度、克制使用。
- **品牌色調詞**: Authoritative 權威 / Curated 精選 / Verified・稀缺 / Local 香港視角 / Bold・克制並存。
- **UI 語言**: 繁體中文（香港用語）為主；導航與產品標籤採雙語並置（如 `Insights 情報`、`Ask 問答`）。

### 1.3 硬性禁令 (Hard Rules)

- ❌ **任何裝飾性漸層** — 尤其藍紫「AI startup」漸層。背景、按鈕、卡片一律純色。唯二例外：(a) Verified 徽章內 <3% 透明度的光澤掃掠；(b) 品牌條紋/chevron 圖案——但它們是 **hard-stop pattern**（`repeating-linear-gradient` 硬色標），禁止任何色彩過渡或 blending。
- ❌ 卡通/吉祥物插畫、UI 內 emoji、圓潤 blob SaaS 形狀、3D 塑膠圖標。
- ❌ Generic SaaS 模板佈局（置中 hero + 3 張功能卡 + 紫色 CTA）。佈局邏輯是**編輯式出版網格**。
- ❌ 高飽和背景、多強調色、霓虹態、玻璃擬態。**lime 只用於強調，永遠不做大面積背景**。
- ❌ 「機械手觸碰人手」、發光電路大腦等 AI 圖庫 cliché。
- ❌ **Logo blue 不得擴張成第二 UI accent**；舊 token 名（`--ink*`、`--gold*`）只可作為 brand-green 系統的 alias。
- ✅ **Brand green 是唯一產品強調色**: 連結、active 態、主按鈕、Verified 徽章、VIP 標記、精選 tick、metric 數字。淺色文字場景用深綠 `#087568`（AA），互動填充用 `#42CAAC` + deep navy 字。
- ✅ **條紋紀律**: 每頁最多 ~3 個條紋時刻，只用 `.stripe-block` / `.stripe-block-dark` / `.chevron-strip` 三個工具類，禁止手寫新圖案。

### 1.4 設計原則

1. **Editorial first** — 內容層級永遠勝過介面裝飾。
2. **One product accent** — brand green 負責所有互動與強調；logo blue 永遠只留在官方 artwork。
3. **Data earns trust** — 每個論點以數字與來源呈現，不用形容詞。
4. **Whitespace is the luxury material** — section 間距 96–120px，卡片 padding 24–32px。
5. **Dark mode 同等品質** — 不是反色事後補救，兩主題各自調校。

---

## 2. Color System（約束性 — 精確 hex）

### 2.1 Light Mode — cool paper

| Token | Hex | 用途 |
| --- | --- | --- |
| `bg` | `#F5F7FA` | 頁面背景（cool paper） |
| `surface` | `#FFFFFF` | 導航、卡片等浮起面 |
| `card` | `#EDF1F5` | 卡片內嵌層 / wells / 代碼塊 |
| `overlay` | `#FFFFFF` @ 92% | Drawer、Ask 輸入列背板 |
| `text-primary` | `#101C30` | 標題、強調正文（AAA） |
| `text-secondary` | `#4A5668` | 正文、metadata（AAA） |
| `text-muted` | `#5D6775` | 時間戳、來源名、placeholder（四個淺色 surface 上均 AA） |
| `border` | `#DDE3EA` | 髮絲線、卡片邊框 |
| `border-strong` | `#BCC6D2` | 輸入框、強調分隔線 |
| **`lime` brand green** | `#42CAAC` | 唯一產品強調色：互動填充、Verified 環、深色模式文字強調 |
| `lime-hover` | `#35B598` | green 填充 hover（稍暗） |
| **`lime-text` 深綠** | `#087568` | 淺色模式文字／連結／active 態；在 bg、surface、card、lime-soft 上均達 AA |
| `lime-soft` | `#DDF3EE` | 染色 chip/tag 背景、Ask AI 氣泡（淺色） |
| `on-accent` | `#02122C` | green 填充上的 deep navy 字 |
| `success` | `#3E7A52` | 正向 delta、已發佈 |
| `warning` | `#A36A0F` | 額度 80% 告警、待審核（語義色，非強調色） |
| `error` | `#A63A30` | 錯誤、破壞性操作 |

> Legacy alias：`--ink` → `lime-text`、`--ink-solid` → `lime`、`--ink-hover` → `lime-hover`、`--ink-soft` → `lime-soft`、`--gold`/`--gold-soft` → lime 系統。舊 class 名（`text-ink`、`bg-gold` 等）全部自動讀作 lime 家族。

### 2.2 Dark Mode — deep navy canvas

| Token | Hex | 用途 |
| --- | --- | --- |
| `bg` | `#02122C` | 頁面背景（deep navy） |
| `surface` | `#0A1E3C` | 導航、卡片 |
| `card` | `#0E2547` | wells、內嵌層 |
| `overlay` | `#0A1E3C` @ 92% | Drawer、輸入列 |
| `text-primary` | `#EAF0F6` | 標題（AAA） |
| `text-secondary` | `#B8C4D0` | 正文（AAA） |
| `text-muted` | `#8593A5` | captions（AA） |
| `border` | `#1C3355` | 髮絲線 |
| `border-strong` | `#2C4A73` | 輸入框 |
| **`lime`** | `#42CAAC` | 深色模式文字／連結／填充強調 |
| `lime-hover` | `#35B598` | green 填充 hover |
| `lime-soft` | `#0F3A33` | 染色 chip 背景、Ask AI 氣泡（深色） |
| `success` | `#6FAE85` | — |
| `warning` | `#D9A03C` | 80% 告警 |
| `error` | `#D9756A` | — |

> Cinematic dark band（hero + footer）與 dark theme 共用 deep-navy family + brand green，避免另起第二套 accent。

### 2.3 Tier 規則

- **背景層級即深度**: `bg`（頁面）→ `surface`（卡片/導航）→ `card`（卡片內嵌，如案例 metric strip）。不可跳層。
- **邊框優先於陰影**。Light：1px `border` + 可選 `0 1px 2px rgba(28,27,25,0.04)`。Dark：**只用邊框，禁陰影**（陰影在炭色上顯髒）。
- 卡片不允許彩色背景，唯二例外：(a) Ask 的 AI 回答氣泡用 `lime-soft`，(b) VIP upsell 區塊用 `lime-soft` 深/淺色對應 tint。

### 2.4 語義色映射

| 含義 | 色 | 例子 |
| --- | --- | --- |
| 正向/已發佈 | `success` | 「已認證」輔助、+delta chip |
| 待審核/額度 ≥80% | `warning`（琥珀，非金） | Ask 額度條最後 1 格 |
| 錯誤/失敗 | `error` | 額度歸零、表單錯誤 |

### 2.5 專家專屬色（僅 Expert Profile 頁）

每位導師帶一個 `brand_color`，只替換三處：hero 背景染色（expert 色 10% alpha 蓋在 `bg` 上）、姓名下劃線（2px × 64px）、該頁 Ask 氣泡邊框。顏色必須去飽和（HSL 飽和度 ≤45%、明度 30–60%），金色永遠禁止作為專家色。

本專案已定專家色：
- **Marcus Chan 陳奕朗**: `#466A5E`（灰綠，hsl 158° 20% 35%）
- **Karena Leung 梁凱晴**: `#8A5A44`（赭陶，hsl 19° 34% 40%）

---

## 3. Typography（約束性）

### 3.1 字體配對

| 角色 | Latin | 繁體中文 | 載入 |
| --- | --- | --- | --- |
| **Display**（hero、專家姓名、日報刊頭、KPI 數字） | **Fraunces** 400–600 | **Noto Serif TC** 500/700 | Google Fonts，`display: swap`，weight-limited |
| **Body / UI**（正文、導航、卡片） | **Inter** 400–600 | **Noto Sans TC** 400/500 | 同上 |
| **Data / mono**（指標、日期、期號） | **IBM Plex Mono** 400/500 | CJK 回落 Noto Sans TC | 同上 |

```css
--font-display: "Fraunces", "Noto Serif TC", serif;
--font-sans:    "Inter", "Noto Sans TC", system-ui, sans-serif;
--font-mono:    "IBM Plex Mono", "Noto Sans TC", monospace;
```

標題設 `font-feature-settings: "palt"`（CJK 比例間距）。

### 3.2 字級（1.25 modular，為 CJK 調校）

| Token | px | Line-height | Weight | Tracking | 用途 |
| --- | --- | --- | --- | --- | --- |
| `display-xl` | 64 | 1.1 | Fraunces 550 / Serif TC 700 | -0.01em | 首頁 hero 定位語 |
| `display-lg` | 48 | 1.15 | 550 / 700 | -0.01em | 專家姓名、日報刊頭 |
| `display` | 40 | 1.2 | 550 / 700 | -0.005em | 頁面 H1 |
| `h2` | 32 | 1.25 | 550 / 700 | -0.005em | Section 標題 |
| `h3` | 24 | 1.3 | sans 600 / Serif TC 700 | 0 | 卡組標題、文章 H2 |
| `h4` | 20 | 1.35 | Inter 600 / Sans TC 500 | 0 | 卡片標題 |
| `body-lg` | 18 | 1.7 | 400 / 400 | 0 | 文章導言、AI 回答 |
| `body` | 16 | 1.7 | 400 / 400 | 0 | 預設正文（CJK 下限） |
| `body-sm` | 15 | 1.65 | 400 / 400 | 0 | 卡片摘要、AI 摘要 |
| `label` | 14 | 1.4 | 500 / 500 | +0.01em | 按鈕、導航、表單標籤 |
| `caption` | 13 | 1.45 | 400 / 400 | +0.01em | 時間戳、來源名 |
| `overline` | 13 | 1.3 | 600 / 500 | Latin +0.12em 全大寫；CJK +0.2em 正常大小寫 | 分類標籤、section eyebrow |
| `metric` | 36 | 1.1 | Plex Mono 500 | 0 | 案例數據、KPI 數字 |

規則：**標題用襯線，UI 用無襯線**。中文可讀文字不低於 13px；overline 統一使用 13px，避免中英混排時中文跌穿可讀下限。文章正文最大行寬 44rem（≈38–42 CJK 字/行）。CJK 行內不加 letter-spacing，Latin run 可加 0.02em。

---

## 4. Spacing / Radius / Layout

- **間距刻度**: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 120 px。
- **Section 垂直節奏**: desktop 96px，mobile 64px；hero 上方 padding 120px。
- **容器**: 1200px max-width，24px gutters，水平置中。
- **Radius**: `sm 4px`（chips/tags）、`md 8px`（卡片/輸入框）、`lg 12px`（drawer/modal/chat 氣泡）。**禁止全圓 pill 卡片**；pill 僅用於 tag/status chip。
- **網格**: 卡片牆 desktop 2–3 欄（24px gap），平板 2 欄，手機單欄。橫向卡片牆卡片固定 340px 寬。

---

## 5. Motion & Animation Style

動效哲學：**print-like stillness, alive only on intent** — 印刷般的靜謐，僅在意圖發生時甦醒。不用 parallax、不用 pinned scroll、不用 3D/shader — 那些會破壞 Formal+Luxury 的克制。所有動效 GPU-only（`transform`/`opacity`）。

### 5.1 進場動效（全站統一，只播放一次）

- **Scroll reveal**: `opacity 0→1` + `translateY(24px)→0`，450ms，easing `cubic-bezier(0.4, 0, 0.2, 1)`，觸發點 = 元素進入 viewport 20% 處（IntersectionObserver，once）。
- **群組 stagger**: 同組卡片 stagger 80ms/張，單 viewport 同時動畫元素 ≤8。
- **Hero 文字**: 進入時行級 reveal（每行 translateY(32px) + opacity，stagger 100ms，600ms）。字級動畫僅限 ≤20 字符的 Latin 短句；中文一律行級。
- **數字**: `metric` 數字進入 viewport 時 count-up（800ms，ease-out，整數）— 僅首頁案例數據與定價頁使用。

### 5.2 Hover 微互動（約束性規格）

| 元素 | 效果 | 參數 |
| --- | --- | --- |
| 內容卡（Insight/Case） | 抬升 + 邊框加深 | `translateY(-2px)`，border → `border-strong`，180ms ease-out |
| 卡片標題 | 墨色顯現 | color → `ink`，150ms |
| 頭像 | 灰階 → 彩色，抬升 2px | filter transition 250ms |
| 行內連結 | 下劃線滑入 | background-size trick，200ms，offset 2px |
| 實心 brand-green 按鈕 | 變深 | bg → `lime-hover`，120ms；按下 `scale(0.98)` 80ms |
| Citation chips | 文字 → `ink` + 下劃線 | 120ms，**不位移**（chips 必須穩定可信） |
| 導航連結 | active 態 | `ink` 文字 + 2px `ink` 下劃線，offset 6px |

### 5.3 專項動效

- **Verified 徽章光澤**: 30° 線性高光（white @ 22% → transparent，dark mode 降至 14%）掃過金環，寬度為徽章 40%，900ms，`cubic-bezier(0.4,0,0.2,1)`。觸發：hover，或環境循環每 8s（頭像牆每枚 stagger 200ms）。光澤不得超出金環邊界。CSS mask + ::after，transform-only。
- **打字機（Ask）**: 基速 24 字/秒，逐 CJK 字 / 逐 Latin 詞；標點（。，！？：）後停 120ms，段落後停 260ms，±20ms 隨機抖動。游標 `▍`（`ink` 色，530ms 閃爍），完成後 400ms 消失。引用 chips 在文字完成後 fade-in（120ms，stagger 60ms）。等待首 token 時顯示 3 條 `card` 色脈衝條（opacity 0.6↔1，1.2s）— **禁 shimmer 漸層**。
- **主題切換**: CSS 變數 200ms cross-fade，無全頁閃白。
- **滾動**: Lenis 平滑滾動（lerp 0.1）；錨點跳轉平滑。

### 5.4 Reduced-motion 降級（`prefers-reduced-motion`）

進場 reveal → 直接顯示；卡片抬升 → 僅邊框變色；打字機 → 即時完整渲染、隱藏游標；徽章光澤 → 靜態；主題切換 → 即時；Lenis 停用。所有 keyframes/transition 包在 `@media (prefers-reduced-motion: no-preference)`。

### 5.5 Cursor

原生系統游標（luxury 克制 — 不做自定義游標）。互動元素 `cursor: pointer`，文字可選取。

---

## 6. Shared Components

### 6.1 Navbar（全站，sticky）

- 64px 高，`surface` 背景 + 1px `border` 底線，滾動時不變化（無毛玻璃、無縮放）。
- 左：官方透明底三點 AIGRO wordmark（light 用 navy 版，dark 用 white 版）+ 可選 `caption` `text-muted`「香港 AI・增長情報」。不可用文字或 CSS 重畫 logo。
- 中（desktop）：`label` 雙語連結 — `Insights 情報` · `Skills 技能` · `Experts 專家` · `Ask 問答` · `Pricing 方案`。英文係主標籤、中文係同一行嘅輔助 caption。Active：主文字加深 + 底部 2px lime bar；避免瀏覽器 underline 令中英基線顯得不齊。
- 右：深淺色切換 + 身份動作。未登入顯示「登入」與「加入 Club」；已登入收斂成 avatar + 角色入口嘅單一帳戶選單，選單內先顯示完整名稱、角色、平台入口、帳戶設定與登出，避免長名稱擠壓主導航。
- Mobile：<768px 漢堡選單（Lucide `menu`），全屏 drawer（`overlay` 背景，大襯線連結，stagger 80ms 滑入）。

### 6.2 Footer（全站）

- `bg` 背景 + 1px `border` 頂線，64px 上下 padding。
- 4 欄（desktop）：**AIGRO**（wordmark + `body-sm` 一句定位「可信賴的 AI・增長・商業情報，香港視角。」）｜**內容**（Insights 情報 / Daily 日報 / Cases 案例 / Library 資源庫）｜**平台**（Experts 專家 / Ask 問答 / Pricing 方案 / 導師申請）｜**Developers**（`body-sm`：「MCP / API 即將開放 — 將 AIGRO 情報接入你的 AI 工作流。」+ `caption` 灰字「開發者優先名單」email 輸入）。
- 底列：`caption` `text-muted`「© 2025 AIGRO・內容經編輯審核・AI 回答僅供參考・來源與授權聲明」+ 深淺色切換。

### 6.3 Buttons

| 變體 | 規格 |
| --- | --- |
| Primary | `lime` 實心（`#42CAAC`），**`on-accent` deep navy `#02122C`**，`label`，高 44px，padding-x 24px，radius-md。Hover → `lime-hover`（`#35B598`）；press scale(0.97) |
| Outline | 1px `border-strong`，lime 系文字（light=`lime-text` / dark=`lime`），透明底。Hover → `lime-soft` 底 |
| Ghost | 無邊框，lime 系文字 + Lucide arrow-right，hover 箭頭右移 4px |
| VIP 標記 | 僅 Pricing/專家頁：lime 實心 + lime `caption` 鎖定標籤（gold 已退役，VIP  accent 一律 lime） |

### 6.4 Verified Badge「認證印」（Direction A — 主用，lime 版）

24×24px 圓形印章：**1.5px brand-green 環（`lime` `#42CAAC`）+ deep-navy 實心圓盤（`on-accent` `#02122C`）**，負空間切出極簡勾形（light surface `#F5F7FA` 6×6px）。尺寸：16px（列表行內）/ 24px（頭像角標）/ 40px（專家 hero）。Verified 頭像環同用 1.5px brand green。首次出現必配文字「已認證 Verified」。`role="img" aria-label="已認證導師 Verified mentor"`。待用狀態：虛線 `border-strong` 環 + `caption`「敬請期待」，**不放徽章**。光澤動效見 §5.3。密集列表（>3 枚）改用 Direction B 單色版（squircle 外框 + 右上角 brand-green 小菱形，全 `text-muted` 亦可）。

### 6.5 Insight Card 情報卡

1. Overline 行：分類 chip（`ink-soft` 底 + `ink` 字，`overline`）+ Lucide 分類圖標 16px `text-muted` + 閱讀時間 `caption`。
2. 標題 `h4`，2 行 clamp，`text-primary`。
3. AI 摘要 `body-sm`，`text-secondary`，3 行 clamp。
4. **香港視角區塊**（差異化核心，絕不可埋沒）：左 2px `ink` 邊框，前置 overline「香港視角 HK ANGLE」，`body-sm` `text-secondary`。
5. 頁尾行：來源名 + external-link 圖標（`caption` `text-muted`）、時間戳、Plex Mono 分數小數字。
規格：`surface` 底，1px `border`，radius-md，padding 24px。Hover 見 §5.2。

### 6.6 Case Card 案例卡

行業 tag + 工具 tag → `h4` 標題 → **Metric strip**（`card` 色內嵌 well，16px padding，1–3 個指標：Plex Mono 36px `ink` 數字 + `caption` 標籤）→ 一行方法摘要 `body-sm` → 來源行 `caption` `text-muted`。無量化成果的案例不得上首頁。

### 6.7 Category Chips

`overline`，`ink-soft` 底 + `ink` 字，radius-sm，padding 6px 12px。Active：`ink` 實心底 + 白字。Hover（非 active）：border `ink`。

### 6.8 分類 Lucide 圖標（統一 16px，`text-muted`，不著色）

模型發布 `cpu` · 產品發布 `package` · 行業動態 `building-2` · 論文研究 `file-text` · 觀點與技巧 `lightbulb`。

### 6.9 Newsletter Block 訂閱（全站共用，首頁與頁尾前）

`surface` 全寬帶 + `border` 上下線。左：襯線 `h3`「每週精選，直達信箱」+ `body-sm` 說明；右：email 輸入（`border-strong`，radius-md，48px 高）+ brand-green 實心／deep-navy 字「訂閱」按鈕；下方 `caption` `text-muted`「每週一封，隨時退訂」。成功態：`success` 色勾圖標 +「已訂閱成功」替換輸入框。無 modal、無彩帶。

---

## 7. Dependencies

- **核心**: Node.js 20 · Vite 7 · React 19 + TypeScript · Tailwind CSS v3.4.19 · shadcn/ui（CSS variables 模式，`primary`→`ink`，`destructive`→`error`）
- **動效**: framer-motion（進場 reveal、stagger、hover 微互動、頁面轉場）；GSAP 可選（僅用於 metric count-up）
- **滾動**: lenis（平滑滾動）
- **圖標**: lucide-react（1.5px stroke，16/20/24px）
- **字體**: Google Fonts — Fraunces (400/500/600), Noto Serif TC (500/700), Inter (400/500/600), Noto Sans TC (400/500), IBM Plex Mono (400/500)
- **主題**: class-based dark mode（`.dark` on `<html>`），localStorage 持久化，預設跟隨系統
- **路由**: react-router-dom v7（前端原型，mock data，無後端）
- 禁用：任何會引入漸層預設的 UI kit 主題。

### Tailwind token 映射（實作依據）

`:root` / `.dark` CSS 變數按 §2 的 HSL 三聯值逐一建立（`--bg/--surface/--card/--text-*/--border*/--lime/--lime-hover/--lime-text/--lime-soft/--on-accent/--success/--warning/--error/--expert-accent`；`--ink*`、`--gold*` 為指向 lime 系統的 legacy alias），tailwind config 按 §8.3 擴展 colors（含 `lime.*`、`on-accent`）/fontFamily/fontSize/borderRadius/keyframes（`badge-sheen`、`caret-blink`）。條紋圖案用 `.stripe-block` / `.stripe-block-dark` / `.chevron-strip` 工具類（`--stripe-color` 隨主題切換）。

---

## 8. Page List（共 11 頁）

| # | 檔案 | 路由 | 一句描述 |
| --- | --- | --- | --- |
| 1 | `home.md` | `/` | Hero 定位語 + 今日精選速覽 + 情報牆 + 案例精選 + 導師頭像牆 + Ask CTA + Newsletter |
| 2 | `insights.md` | `/insights` | 情報列表：分類篩選、排序切換、2 欄卡格、Daily 日報入口 |
| 3 | `daily.md` | `/insights/daily` | 每日精選日報：報紙刊頭版式、頭條 + 編號列表、期號儀式感 |
| 4 | `insight-detail.md` | `/insights/:slug` | 單篇情報詳情：AI 摘要 + 香港視角長評 + 來源連結 + 相關情報 |
| 5 | `cases.md` | `/cases` | 香港本地落地案例庫：行業篩選、metric strip 卡片 |
| 6 | `case-detail.md` | `/cases/:slug` | 案例深度拆解：背景 → 工具/方法 → 成果數據 → 可複製步驟 |
| 7 | `library.md` | `/library` | 工具評測 + Prompt/工作流模板（6 分類），香港本地化評估 |
| 8 | `experts.md` | `/experts` | 認證導師總覽：Verified 徽章牆 + 敬請期待位 |
| 9 | `expert-profile.md` | `/experts/:slug` | 專家個人頁：專屬配色 hero、成就佐證、授權透明度、AI 分身入口 |
| 10 | `ask.md` | `/ask` | AI 編輯部對話：引用 chips、免費額度條、打字機、升級 CTA |
| 11 | `pricing.md` | `/pricing` | 免費／創始會員／VIP 三層方案（premium 同用單一 brand green）+ 月費／年費切換 + FAQ |

---

## 9. Assets（資產清單 — 由 Scaffold agent 生成）

本設計以排版、圖標、純色為主體，**不需要**插畫或 hero 背景圖。僅需專家環境人像攝影（灰階處理由 CSS 完成，原圖請提供彩色、低飽和版本）：

| 檔名 | 描述（生成 prompt） | 用於 | 尺寸 / 比例 | 類型 |
| --- | --- | --- | --- | --- |
| `expert-marcus-chan.jpg` | Editorial environmental portrait photograph of a confident Hong Kong Chinese man in his early 40s, short neat hair, dark navy blazer over plain tee, standing in a quiet modern office with soft window light, muted desaturated warm-gray tones, shallow depth of field, magazine editorial quality (MasterClass style), calm authoritative expression, no props | Experts 牆、專家頁 hero、Ask 頭像 | 800×800 1:1 | Image |
| `expert-karena-leung.jpg` | Editorial environmental portrait of a Hong Kong Chinese woman in her late 30s, shoulder-length hair, tailored charcoal jacket, seated at a minimal creative studio desk with warm side light, muted desaturated terracotta-gray palette, shallow depth of field, magazine editorial quality, composed confident expression | Experts 牆、專家頁 hero、Ask 頭像 | 800×800 1:1 | Image |
| `expert-kelvin-wong.jpg` | Editorial environmental portrait of a Hong Kong Chinese man in his mid 30s, glasses, dark knit sweater, co-working space background softly blurred, muted warm-gray desaturated tones, shallow depth of field, magazine editorial quality, thoughtful expression | Experts 牆（待用態）、專家頁 | 800×800 1:1 | Image |
| `expert-jocelyn-ng.jpg` | Editorial environmental portrait of a Hong Kong Chinese woman in her early 30s, tied-back hair, minimalist dark blouse, modern retail-tech office background blurred, muted warm-gray desaturated tones, shallow depth of field, magazine editorial quality, poised expression | Experts 牆（待用態）、專家頁 | 800×800 1:1 | Image |
| `expert-eric-cheng.jpg` | Editorial environmental portrait of a Hong Kong Chinese man in his late 30s, light stubble, charcoal suit no tie, fintech office glass wall background blurred, muted warm-gray desaturated tones, shallow depth of field, magazine editorial quality, steady expression | Experts 牆（待用態）、專家頁 | 800×800 1:1 | Image |
| `og-image.png` | Approved AIGRO editorial share card: cool-paper `#F5F7FA` or deep-navy `#02122C` canvas, official supplied three-dot wordmark used unchanged, Chinese tagline 「香港 AI・增長情報平台」 in Noto Serif TC, one restrained brand-green `#42CAAC` rule or focal detail, generous negative space, no gradients and no extra logo-blue UI decoration | 社群分享 OG 圖 | 1200×630 | Image |

---

## 10. Growth Loop（UX 必須體現）

訪客 → Insights/Cases 建立信任 → 免費試 Ask → Experts 頁 → 分身對話（限額）→ 訂閱/預約 → 分享回流。
對應 CTA 規則：首頁 section 順序固定（信任 → 嚮往 → 行動 → 捕獲）；每篇情報/案例詳情頁尾放 Ask 入口；Ask 額度用盡 → Pricing；Pricing VIP → 專家預約；專家頁待用態 → 訂閱上線通知。
