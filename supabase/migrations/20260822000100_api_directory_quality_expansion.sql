-- AIGRO API directory quality expansion.
--
-- The complete pinned public-apis snapshot remains available to admins as
-- drafts. This migration promotes a deliberately small, provider-verified
-- cross-category set and adds six essential APIs that are missing upstream.
-- It never treats the upstream catalogue itself as a runtime dependency.

with reviewed_seed (
  source_identity_url,
  name,
  description_en,
  editorial_summary_zh_hk,
  category,
  use_cases,
  auth_type,
  cors_status,
  docs_url,
  hk_relevance
) as (
  values
    (
      'https://docs.virustotal.com/reference/overview',
      'VirusTotal',
      'File, URL, domain and IP reputation analysis.',
      '檔案、網址、網域同 IP 風險分析服務，適合保安檢查同威脅情報原型；上載檔案前要先確認資料私隱。',
      'Anti-Malware', array['網址風險檢查', '威脅情報']::text[],
      'apiKey', 'unknown', 'https://docs.virustotal.com/reference/overview', 'high'
    ),
    (
      'https://metmuseum.github.io/',
      'Metropolitan Museum of Art',
      'Open access to artwork, artist and collection metadata from The Met.',
      '大都會藝術博物館開放館藏資料，適合文化內容、教育產品同視覺搜尋原型。',
      'Art & Design', array['藝術內容研究', '教育產品']::text[],
      'No', 'no', 'https://metmuseum.github.io/', 'low'
    ),
    (
      'https://auth0.com/',
      'Auth0',
      'Authentication, authorization and identity management APIs.',
      '身份驗證、授權同用戶管理接口，適合 SaaS 登入、企業 SSO 同權限管理；正式使用要審核 token 同租戶設定。',
      'Authentication & Authorization', array['SaaS 登入', '權限管理']::text[],
      'apiKey', 'yes', 'https://auth0.com/docs/api', 'medium'
    ),
    (
      'https://etherscan.io/apis',
      'Etherscan',
      'Multi-chain EVM balances, transactions, contracts and on-chain data.',
      '提供多條 EVM 鏈嘅交易、餘額、合約同鏈上資料，適合研究、錢包同合規儀表板；要留意方案額度。',
      'Blockchain', array['鏈上研究', '錢包資料']::text[],
      'apiKey', 'yes', 'https://docs.etherscan.io/', 'medium'
    ),
    (
      'https://developers.trello.com/',
      'Trello',
      'Boards, lists, cards and automation for project workflows.',
      'Trello 看板、清單同卡片資料，適合專案同步、內容流程同營運自動化。',
      'Business', array['專案同步', '營運自動化']::text[],
      'OAuth', 'unknown', 'https://developer.atlassian.com/cloud/trello/rest/', 'medium'
    ),
    (
      'https://www.dropbox.com/developers',
      'Dropbox',
      'File storage, sharing, search and team content integrations.',
      '檔案儲存、分享同搜尋接口，適合文件工作流、備份同團隊內容整合；要限制 OAuth 權限範圍。',
      'Cloud Storage & File Sharing', array['文件工作流', '檔案同步']::text[],
      'OAuth', 'unknown', 'https://www.dropbox.com/developers', 'medium'
    ),
    (
      'https://circleci.com/docs/api/v1-reference/',
      'CircleCI',
      'CI/CD pipelines, projects, workflows and build insights.',
      'CI/CD pipeline、workflow 同 build 資料，適合部署自動化、工程儀表板同失敗通知。',
      'Continuous Integration', array['部署自動化', 'Build 監測']::text[],
      'apiKey', 'unknown', 'https://circleci.com/docs/api/v2/', 'medium'
    ),
    (
      'https://developers.cloudflare.com/api/',
      'Cloudflare',
      'Manage DNS, CDN, Workers, security and other Cloudflare services.',
      '管理 DNS、CDN、Workers 同保安設定，適合網站營運、邊緣運算同基建自動化。',
      'Development', array['網站營運', '基建自動化']::text[],
      'apiKey', 'no', 'https://developers.cloudflare.com/api/', 'high'
    ),
    (
      'https://docs.docker.com/docker-hub/api/latest/',
      'Docker Hub',
      'Repositories, images, tags and organizations on Docker Hub.',
      'Docker image、tag 同 repository 資料，適合軟件供應鏈、版本追蹤同部署工具。',
      'Development', array['Image 版本追蹤', '部署工具']::text[],
      'apiKey', 'yes', 'https://docs.docker.com/docker-hub/api/latest/', 'medium'
    ),
    (
      'https://jsonplaceholder.typicode.com/',
      'JSONPlaceholder',
      'A fake REST API for learning, testing and rapid prototypes.',
      '免 key 假 REST 資料，適合 API 教學、前端原型同自動化測試；唔應該當正式資料來源。',
      'Development', array['API 教學', '前端測試']::text[],
      'No', 'yes', 'https://jsonplaceholder.typicode.com/', 'medium'
    ),
    (
      'https://ctext.org/tools/api',
      'Chinese Text Project',
      'Open digital library and API for pre-modern Chinese texts.',
      '中國哲學書電子化計劃嘅古籍同文本資料，適合中文研究、教育內容同數碼人文原型。',
      'Dictionaries', array['中文文本研究', '教育內容']::text[],
      'No', 'unknown', 'https://ctext.org/tools/api', 'high'
    ),
    (
      'https://developers.notion.com/docs/getting-started',
      'Notion',
      'Read, create and update workspace pages, data sources and comments.',
      '讀寫 Notion 頁面、資料來源同留言，適合內容系統、知識庫同團隊自動化；連線要採用最小權限。',
      'Documents & Productivity', array['知識庫整合', '內容自動化']::text[],
      'OAuth', 'unknown', 'https://developers.notion.com/guides/get-started/overview', 'high'
    ),
    (
      'https://docs.openaq.org/',
      'OpenAQ',
      'Open global air-quality measurements and location data.',
      '全球空氣質素量度同地點資料，適合環境監測、城市研究同健康資訊原型；展示時要交代站點覆蓋。',
      'Environment', array['空氣質素監測', '城市研究']::text[],
      'apiKey', 'unknown', 'https://docs.openaq.org/', 'high'
    ),
    (
      'https://www.alphavantage.co/',
      'Alpha Vantage',
      'Stock, foreign-exchange, commodity and market indicator data.',
      '股票、外匯、商品同技術指標資料，適合市場研究同投資內容原型；唔應視作即時交易報價。',
      'Finance', array['市場研究', '投資內容原型']::text[],
      'apiKey', 'unknown', 'https://www.alphavantage.co/documentation/', 'high'
    ),
    (
      'https://fred.stlouisfed.org/docs/api/fred/',
      'FRED',
      'Economic time series from the Federal Reserve Bank of St. Louis.',
      '聯儲銀行經濟時間序列，適合宏觀研究、商業情報同數據內容；引用時要保留原始系列來源。',
      'Finance', array['宏觀研究', '商業情報']::text[],
      'apiKey', 'yes', 'https://fred.stlouisfed.org/docs/api/fred/', 'medium'
    ),
    (
      'https://world.openfoodfacts.org/data',
      'Open Food Facts',
      'Open product, ingredient and nutrition data from food labels.',
      '開放食品標籤、成分同營養資料，適合產品搜尋同飲食資訊原型；眾包資料要顯示完整度限制。',
      'Food & Drink', array['食品資料搜尋', '營養資訊原型']::text[],
      'No', 'unknown', 'https://openfoodfacts.github.io/openfoodfacts-server/api/', 'medium'
    ),
    (
      'https://open.fda.gov/',
      'openFDA',
      'Public FDA data about drugs, devices and food enforcement.',
      'FDA 藥物、醫療器材同食品執法公開資料，適合研究同風險監測；內容不可取代專業醫療意見。',
      'Health', array['醫療資料研究', '產品風險監測']::text[],
      'apiKey', 'unknown', 'https://open.fda.gov/apis/', 'medium'
    ),
    (
      'https://developer.adzuna.com/overview',
      'Adzuna',
      'Aggregated job listings, salary data and labour-market insights.',
      '職位、薪酬同就業市場資料，適合招聘搜尋同勞動市場研究；要先確認目標地區覆蓋。',
      'Jobs', array['招聘搜尋', '就業市場研究']::text[],
      'apiKey', 'unknown', 'https://developer.adzuna.com/overview', 'medium'
    ),
    (
      'https://shields.io/',
      'Shields.io',
      'Generate concise status badges for repositories and services.',
      '為 repository 同網上服務產生狀態 badge，適合開源專案、文件同 build 狀態展示。',
      'Open Source Projects', array['README Badge', 'Build 狀態展示']::text[],
      'No', 'unknown', 'https://shields.io/docs', 'medium'
    ),
    (
      'https://haveibeenpwned.com/API/v3',
      'Have I Been Pwned',
      'Breach, compromised account and pwned-password data.',
      '資料外洩、受影響帳戶同外洩密碼資料，適合保安檢查同風險提示；查詢個人資料前要有合法目的。',
      'Security', array['外洩風險檢查', '密碼安全提示']::text[],
      'apiKey', 'unknown', 'https://haveibeenpwned.com/API/v3', 'high'
    ),
    (
      'https://developer.ebay.com/',
      'eBay',
      'Marketplace inventory, listings, orders and buying integrations.',
      '商品、刊登、訂單同 marketplace 資料，適合跨境電商研究同營運工具；要跟足平台政策。',
      'Shopping', array['跨境電商', '商品研究']::text[],
      'OAuth', 'unknown', 'https://developer.ebay.com/', 'high'
    ),
    (
      'https://openf1.org/',
      'OpenF1',
      'Real-time and historical Formula 1 timing, telemetry and position data.',
      'F1 即時同歷史圈速、遙測及位置資料，適合體育數據內容、直播圖表同分析原型。',
      'Sports & Fitness', array['體育數據內容', '賽事分析']::text[],
      'No', 'yes', 'https://openf1.org/', 'low'
    ),
    (
      'https://randomuser.me/',
      'RandomUser',
      'Generate realistic fictional user profiles for testing.',
      '產生虛構用戶資料，適合介面原型、表格測試同教學；唔可以冒充真實身份資料。',
      'Test Data', array['介面原型', '測試資料']::text[],
      'No', 'unknown', 'https://randomuser.me/documentation', 'medium'
    ),
    (
      'https://cloud.google.com/natural-language/docs/',
      'Google Cloud Natural Language',
      'Entity, sentiment, syntax and content classification for text.',
      '文字實體、情感、語法同分類分析，適合內容標註、客服分析同研究原型；要核對語言支援。',
      'Text Analysis', array['內容標註', '客服分析']::text[],
      'apiKey', 'unknown', 'https://docs.cloud.google.com/natural-language/docs', 'medium'
    ),
    (
      'https://openchargemap.org/site/develop/api',
      'Open Charge Map',
      'Global public registry of electric-vehicle charging locations.',
      '全球電動車充電站位置資料，適合旅程規劃、地圖同可持續交通研究；眾包資料要顯示更新日期。',
      'Transportation', array['充電站地圖', '綠色交通研究']::text[],
      'apiKey', 'yes', 'https://www.openchargemap.org/develop/api', 'medium'
    ),
    (
      'https://developers.amadeus.com/self-service',
      'Amadeus for Developers',
      'Flight, hotel, destination and travel-planning APIs.',
      '航班、酒店、目的地同旅遊規劃資料，適合香港旅遊產品同跨境服務原型；正式數據有方案限制。',
      'Transportation', array['旅遊產品', '航班搜尋']::text[],
      'OAuth', 'unknown', 'https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/', 'high'
    ),
    (
      'https://airtable.com/api',
      'Airtable',
      'Records, bases and workflow integrations for Airtable.',
      'Airtable base 同 record 讀寫接口，適合輕量 CRM、內容日曆同營運自動化。',
      'Documents & Productivity', array['輕量 CRM', '營運自動化']::text[],
      'apiKey', 'unknown', 'https://airtable.com/developers/web/api/introduction', 'high'
    ),
    (
      'https://developers.asana.com/docs',
      'Asana',
      'Tasks, projects, teams and workflow automation for Asana.',
      'Asana 任務、專案同團隊資料，適合工作分派、報告同跨工具自動化。',
      'Documents & Productivity', array['任務同步', '專案報告']::text[],
      'apiKey', 'yes', 'https://developers.asana.com/docs/overview', 'medium'
    ),
    (
      'https://developers.google.com/drive/',
      'Google Drive',
      'Files, folders, permissions and shared-drive integrations.',
      'Google Drive 檔案、資料夾同權限接口，適合文件流程、備份同知識庫整合；要採用最小 OAuth scope。',
      'Cloud Storage & File Sharing', array['文件流程', '知識庫整合']::text[],
      'OAuth', 'unknown', 'https://developers.google.com/drive/api/guides/about-sdk', 'high'
    ),
    (
      'https://api.tfl.gov.uk/',
      'Transport for London',
      'Unified public transport, road and journey-planning data for London.',
      '倫敦公共交通、道路同旅程規劃資料，適合城市數據教學同交通產品參考。',
      'Transportation', array['城市交通研究', '旅程規劃原型']::text[],
      'apiKey', 'unknown', 'https://api-portal.tfl.gov.uk/', 'low'
    )
)
insert into public.api_directory_entries as existing (
  name,
  description_en,
  editorial_summary_zh_hk,
  category,
  use_cases,
  auth_type,
  https_supported,
  cors_status,
  docs_url,
  hk_relevance,
  source_kind,
  source_key,
  source_url,
  upstream_ref,
  last_seen_at,
  review_state,
  last_reviewed_at,
  status
)
select
  seed.name,
  seed.description_en,
  seed.editorial_summary_zh_hk,
  seed.category,
  seed.use_cases,
  seed.auth_type,
  true,
  seed.cors_status,
  seed.docs_url,
  seed.hk_relevance,
  'public-apis',
  'public-apis:' || encode(
    extensions.digest(
      convert_to(lower(rtrim(seed.source_identity_url, '/')), 'UTF8'),
      'sha256'
    ),
    'hex'
  ),
  'https://github.com/public-apis/public-apis',
  'c045a2eb505f0f8b7992bb4af53cc020f25003fd',
  now(),
  'aigro_reviewed',
  date '2026-08-22',
  'published'
from reviewed_seed seed
on conflict (source_key) do update
set
  name = excluded.name,
  description_en = excluded.description_en,
  editorial_summary_zh_hk = excluded.editorial_summary_zh_hk,
  category = excluded.category,
  use_cases = excluded.use_cases,
  auth_type = excluded.auth_type,
  https_supported = excluded.https_supported,
  cors_status = excluded.cors_status,
  docs_url = excluded.docs_url,
  hk_relevance = excluded.hk_relevance,
  source_kind = excluded.source_kind,
  source_url = excluded.source_url,
  upstream_ref = excluded.upstream_ref,
  last_seen_at = excluded.last_seen_at,
  review_state = excluded.review_state,
  last_reviewed_at = excluded.last_reviewed_at,
  status = excluded.status
where existing.status = 'draft';

-- These widely used provider APIs are absent from the pinned upstream list.
-- They remain explicitly manual so the directory never claims false
-- public-apis provenance.
with manual_seed (
  source_key,
  name,
  description_en,
  editorial_summary_zh_hk,
  category,
  use_cases,
  auth_type,
  cors_status,
  docs_url,
  hk_relevance
) as (
  values
    (
      'manual:curated:openai', 'OpenAI API',
      'Models and tools for text, images, audio, realtime and agent workflows.',
      '文字、圖像、語音、Realtime 同 agent 工具接口，適合香港團隊建立 AI 產品；API key 只可放伺服器端。',
      'Machine Learning', array['AI 產品原型', 'Agent 工作流']::text[],
      'apiKey', 'unknown', 'https://developers.openai.com/api/reference/overview', 'high'
    ),
    (
      'manual:curated:anthropic', 'Anthropic API',
      'Claude models for text, vision, tool use and agent workflows.',
      'Claude 文字、視覺同工具使用接口，適合知識工作、自動化同 agent 原型；要核對資料及地區條款。',
      'Machine Learning', array['知識工作', 'Agent 原型']::text[],
      'apiKey', 'unknown', 'https://platform.claude.com/docs/en/api/overview', 'high'
    ),
    (
      'manual:curated:stripe', 'Stripe API',
      'Payments, billing, subscriptions, invoicing and financial operations.',
      '付款、訂閱、賬單同財務營運接口，適合 SaaS 同跨境商業；上線前要核對香港支援、合規同收費。',
      'Finance', array['網上付款', '訂閱管理']::text[],
      'apiKey', 'unknown', 'https://docs.stripe.com/api', 'high'
    ),
    (
      'manual:curated:twilio', 'Twilio API',
      'Messaging, voice, verification, email and communications APIs.',
      '短訊、語音、驗證同通訊接口，適合通知、客服同身份驗證；要留意香港號碼、同意及收費要求。',
      'Phone', array['客戶通知', '身份驗證']::text[],
      'apiKey', 'unknown', 'https://www.twilio.com/docs/usage/api', 'high'
    ),
    (
      'manual:curated:supabase', 'Supabase API',
      'Database, authentication, storage, realtime and edge-function APIs.',
      'Postgres、Auth、Storage、Realtime 同 Edge Functions 接口，適合快速建立完整產品後台；要正確設定 RLS。',
      'Development', array['產品後台', 'Realtime 應用']::text[],
      'apiKey', 'unknown', 'https://supabase.com/docs/reference', 'high'
    ),
    (
      'manual:curated:vercel', 'Vercel REST API',
      'Projects, deployments, domains, environment variables and platform resources.',
      '專案、部署、網域同環境變數接口，適合網站發佈、自動化同平台營運；token 要限制權限同妥善保存。',
      'Development', array['部署自動化', '平台營運']::text[],
      'apiKey', 'unknown', 'https://vercel.com/docs/rest-api', 'high'
    )
)
insert into public.api_directory_entries (
  name,
  description_en,
  editorial_summary_zh_hk,
  category,
  use_cases,
  auth_type,
  https_supported,
  cors_status,
  docs_url,
  hk_relevance,
  source_kind,
  source_key,
  review_state,
  last_reviewed_at,
  status
)
select
  seed.name,
  seed.description_en,
  seed.editorial_summary_zh_hk,
  seed.category,
  seed.use_cases,
  seed.auth_type,
  true,
  seed.cors_status,
  seed.docs_url,
  seed.hk_relevance,
  'manual',
  seed.source_key,
  'aigro_reviewed',
  date '2026-08-22',
  'published'
from manual_seed seed
on conflict (source_key) do nothing;
