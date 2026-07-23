import { Route, Routes, useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import usePageMeta from "@/hooks/usePageMeta";
import Home from "@/pages/Home";
import Insights from "@/pages/Insights";
import Daily from "@/pages/Daily";
import InsightDetail from "@/pages/InsightDetail";
import Cases from "@/pages/Cases";
import CaseDetail from "@/pages/CaseDetail";
import Library from "@/pages/Library";
import Experts from "@/pages/Experts";
import ExpertProfile from "@/pages/ExpertProfile";
import Ask from "@/pages/Ask";
import Pricing from "@/pages/Pricing";
import Placeholder from "@/pages/Placeholder";

/** Per-page <title> + meta（v1.1 SEO 基建） */
function RouteMeta() {
  const { pathname } = useLocation();
  const map: [RegExp, string, string?][] = [
    [/^\/$/, "", ""],
    [/^\/insights\/daily/, "每日精選日報", "編輯部每日精選 5 條必讀 AI・增長情報 — 3 分鐘掌握全球脈搏的香港意義。"],
    [/^\/insights\/[^/]+/, "情報詳情", "AI 摘要 + 香港視角長評 + 來源連結。"],
    [/^\/insights/, "情報 Insights", "每日 AI・增長情報：模型發布、產品發布、行業動態、論文研究、觀點與技巧，附香港視角解讀。"],
    [/^\/cases\/[^/]+/, "案例深度拆解", "背景 → 工具/方法 → 成果數據 → 可複製步驟。"],
    [/^\/cases/, "實戰案例 Cases", "香港本地 AI 落地案例庫 — 數據化成果，可複製的做法拆解。"],
    [/^\/library/, "資源庫 Library", "AI 工具評測 + Prompt/工作流模板，附香港本地化（繁中）評估。"],
    [/^\/experts\/[^/]+/, "專家檔案", "領航專家個人頁 — 成就佐證、授權透明度、AI 分身對話入口。"],
    [/^\/experts/, "領航專家 Experts", "由領航專家帶領嘅 growth hacking club — AI 分身基於授權內容蒸餾。"],
    [/^\/ask/, "Ask 問答", "問 AI 編輯部任何 AI、增長、營銷問題 — 每個論點附來源引用。"],
    [/^\/pricing/, "方案 Pricing", "免費/進階/VIP 三層會員方案 — 解鎖無限 AI 對話與領航專家分身。"],
  ];
  const hit = map.find(([re]) => re.test(pathname));
  usePageMeta(hit?.[1] || undefined, hit?.[2] || undefined);
  return null;
}

/**
 * Routing — nested-route pattern: Layout renders <Outlet/>, so ALL routes
 * are children of `<Route element={<Layout/>}` (never mix with children pattern).
 * 11 routes per design.md §8.
 */
export default function App() {
  return (
    <>
      <RouteMeta />
      <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="insights" element={<Insights />} />
        <Route path="insights/daily" element={<Daily />} />
        <Route path="insights/:slug" element={<InsightDetail />} />
        <Route path="cases" element={<Cases />} />
        <Route path="cases/:slug" element={<CaseDetail />} />
        <Route path="library" element={<Library />} />
        <Route path="experts" element={<Experts />} />
        <Route path="experts/:slug" element={<ExpertProfile />} />
        <Route path="ask" element={<Ask />} />
        <Route path="pricing" element={<Pricing />} />
        <Route
          path="*"
          element={
            <Placeholder
              eyebrow="404"
              title="找不到頁面"
              description="此頁面不存在或已移除。"
            />
          }
        />
      </Route>
      </Routes>
    </>
  );
}
