-- AIGRO API Radar expansion pack.
--
-- These are additional manually reviewed entries from the same pinned
-- public-apis snapshot. The full upstream importer still lands the remaining
-- rows as drafts; this migration only publishes the useful launch subset with
-- AIGRO's own zh-HK context and stable URL identities.
with expanded_seed (
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
  source_identity_url
) as (
  values
    (
      'Jikan',
      'Unofficial MyAnimeList data for anime discovery.',
      '動漫資料搜尋同作品資訊 API，適合內容目錄、推薦原型同社群工具；使用前要核對服務條款同流量限制。',
      'Anime',
      array['動漫目錄', '推薦原型']::text[],
      'No', true, 'yes',
      'https://jikan.moe', 'low', 'https://jikan.moe'
    ),
    (
      'AniList',
      'Anime discovery and tracking through a GraphQL API.',
      '動漫作品、角色同追看資料，適合建立個人化追番、內容搜尋同社群產品原型。',
      'Anime',
      array['動漫搜尋', '個人化推薦']::text[],
      'OAuth', true, 'unknown',
      'https://github.com/AniList/ApiV2-GraphQL-Docs', 'low', 'https://github.com/AniList/ApiV2-GraphQL-Docs'
    ),
    (
      'Open Library',
      'Books, book covers and related bibliographic data.',
      '開放書目、封面同作者資料，適合閱讀清單、書店搜尋同知識產品原型。',
      'Books',
      array['書目搜尋', '閱讀清單']::text[],
      'No', true, 'no',
      'https://openlibrary.org/developers/api', 'medium', 'https://openlibrary.org/developers/api'
    ),
    (
      'Google Books',
      'Book search, volumes and reading-related metadata.',
      'Google Books 書目搜尋同卷冊資料，適合教育內容、閱讀產品同資料探索。',
      'Books',
      array['書籍搜尋', '教育內容']::text[],
      'OAuth', true, 'unknown',
      'https://developers.google.com/books', 'medium', 'https://developers.google.com/books'
    ),
    (
      'Nager.Date',
      'Public holidays for more than 90 countries.',
      '多國公眾假期資料，適合香港團隊做跨境排程、活動規劃同假期提醒。',
      'Calendar',
      array['跨境排程', '假期提醒']::text[],
      'No', true, 'no',
      'https://date.nager.at', 'high', 'https://date.nager.at'
    ),
    (
      'ExchangeRate-API',
      'Currency conversion and exchange-rate data.',
      '外匯轉換同貨幣資料，適合 HKD 報價、跨境電商同財務工具原型；正式使用前要核對額度。',
      'Currency Exchange',
      array['HKD 換算', '跨境電商']::text[],
      'apiKey', true, 'yes',
      'https://www.exchangerate-api.com', 'high', 'https://www.exchangerate-api.com'
    ),
    (
      'Mapbox',
      'Maps, geocoding, directions and location tools.',
      '地圖、地址搜尋同路線服務，適合香港選址、物流規劃同門店營運；要留意地圖授權同用量。',
      'Geocoding',
      array['地圖產品', '路線規劃']::text[],
      'apiKey', true, 'unknown',
      'https://docs.mapbox.com', 'high', 'https://docs.mapbox.com'
    ),
    (
      'NASA',
      'NASA data, including imagery and space information.',
      'NASA 太空、地球觀測同影像資料，適合教育內容、研究探索同每日資料靈感。',
      'Science & Math',
      array['科學內容', '影像探索']::text[],
      'No', true, 'no',
      'https://api.nasa.gov', 'medium', 'https://api.nasa.gov'
    ),
    (
      'World Bank',
      'World development and economic data.',
      '世界銀行發展同經濟資料，適合市場研究、宏觀分析同商業情報內容。',
      'Science & Math',
      array['市場研究', '宏觀分析']::text[],
      'No', true, 'no',
      'https://datahelpdesk.worldbank.org/knowledgebase/topics/125589', 'medium', 'https://datahelpdesk.worldbank.org/knowledgebase/topics/125589'
    ),
    (
      'Spotify',
      'Music catalogue, playlists and recommendation data.',
      '音樂目錄、歌單同推薦資料，適合內容研究、播放清單工具同音樂產品原型。',
      'Music',
      array['音樂目錄', '播放清單']::text[],
      'OAuth', true, 'unknown',
      'https://developer.spotify.com/documentation/web-api', 'medium', 'https://beta.developer.spotify.com/documentation/web-api'
    ),
    (
      'Discord',
      'Build bots and integrate Discord with external platforms.',
      'Discord bot 同社群整合工具，適合會員社群、通知流程同 AI agent 互動原型。',
      'Social',
      array['社群營運', 'Bot 自動化']::text[],
      'OAuth', true, 'unknown',
      'https://discord.com/developers/docs/intro', 'medium', 'https://discord.com/developers/docs/intro'
    ),
    (
      'Reddit',
      'Community posts, comments and forum data.',
      '社群討論同內容資料，適合話題研究、受眾洞察同社群監測；要尊重平台政策同私隱。',
      'Social',
      array['話題研究', '社群洞察']::text[],
      'OAuth', true, 'unknown',
      'https://www.reddit.com/dev/api', 'medium', 'https://www.reddit.com/dev/api'
    ),
    (
      'Slack',
      'Team messaging and workspace data.',
      '團隊訊息同工作區整合，適合內部通知、工作流自動化同營運機器人。',
      'Social',
      array['團隊自動化', '內部通知']::text[],
      'OAuth', true, 'unknown',
      'https://api.slack.com', 'medium', 'https://api.slack.com'
    ),
    (
      'Telegram Bot',
      'HTTP API for building Telegram bots.',
      'Telegram bot 官方接口，適合客服通知、社群機器人同內容分發流程。',
      'Social',
      array['Bot 通知', '內容分發']::text[],
      'apiKey', true, 'unknown',
      'https://core.telegram.org/bots/api', 'medium', 'https://core.telegram.org/bots/api'
    ),
    (
      'YouTube',
      'Add YouTube functionality to websites and applications.',
      'YouTube 影片同頻道資料，適合內容研究、影片工作流同創作者工具；要跟足配額及展示規範。',
      'Video',
      array['影片研究', '創作者工具']::text[],
      'OAuth', true, 'unknown',
      'https://developers.google.com/youtube', 'medium', 'https://developers.google.com/youtube'
    ),
    (
      'Open-Meteo',
      'Global weather forecasts for non-commercial use.',
      '免 key 天氣預報資料，適合香港天氣提示、活動規劃同輕量產品原型。',
      'Weather',
      array['天氣提示', '活動規劃']::text[],
      'No', true, 'yes',
      'https://open-meteo.com', 'high', 'https://open-meteo.com'
    ),
    (
      'WeatherAPI',
      'Weather, astronomy and geolocation data.',
      '天氣、天文同地理資料，適合旅遊、活動同生活服務原型；正式使用前要核對配額。',
      'Weather',
      array['旅遊規劃', '天氣服務']::text[],
      'apiKey', true, 'yes',
      'https://www.weatherapi.com', 'medium', 'https://www.weatherapi.com'
    ),
    (
      'Hacker News',
      'Social news for technology and entrepreneurship.',
      '科技創業社群新聞資料，適合趨勢研究、內容選題同開發者情報。',
      'Social',
      array['科技趨勢', '內容選題']::text[],
      'No', true, 'unknown',
      'https://github.com/HackerNews/API', 'medium', 'https://github.com/HackerNews/API'
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
  seed.https_supported,
  seed.cors_status,
  seed.docs_url,
  seed.hk_relevance,
  'public-apis',
  'public-apis:' || encode(
    extensions.digest(convert_to(lower(seed.source_identity_url), 'UTF8'), 'sha256'),
    'hex'
  ),
  'https://github.com/public-apis/public-apis',
  'c045a2eb505f0f8b7992bb4af53cc020f25003fd',
  now(),
  'aigro_reviewed',
  date '2026-08-21',
  'published'
from expanded_seed seed
on conflict (source_key) do nothing;
