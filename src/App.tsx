import { Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Placeholder from "@/pages/Placeholder";

/**
 * Routing — nested-route pattern: Layout renders <Outlet/>, so ALL routes
 * are children of `<Route element={<Layout/>}` (never mix with children pattern).
 * 11 routes per design.md §8.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route
          path="insights"
          element={
            <Placeholder
              eyebrow="Daily Intelligence"
              title="情報 Insights"
              description="分類篩選、排序切換、2 欄卡格、Daily 日報入口。"
            />
          }
        />
        <Route
          path="insights/daily"
          element={
            <Placeholder
              eyebrow="AIGRO Daily"
              title="每日精選日報"
              description="報紙刊頭版式、頭條 + 編號列表、期號儀式感。"
            />
          }
        />
        <Route
          path="insights/:slug"
          element={
            <Placeholder
              eyebrow="Insight"
              title="情報詳情"
              description="AI 摘要 + 香港視角長評 + 來源連結 + 相關情報。"
            />
          }
        />
        <Route
          path="cases"
          element={
            <Placeholder
              eyebrow="Field-Tested in Hong Kong"
              title="實戰案例 Cases"
              description="香港本地落地案例庫：行業篩選、metric strip 卡片。"
            />
          }
        />
        <Route
          path="cases/:slug"
          element={
            <Placeholder
              eyebrow="Case Study"
              title="案例深度拆解"
              description="背景 → 工具/方法 → 成果數據 → 可複製步驟。"
            />
          }
        />
        <Route
          path="library"
          element={
            <Placeholder
              eyebrow="Tools & Playbooks"
              title="資源庫 Library"
              description="工具評測 + Prompt/工作流模板（6 分類），香港本地化評估。"
            />
          }
        />
        <Route
          path="experts"
          element={
            <Placeholder
              eyebrow="Verified Experts"
              title="認證導師 Experts"
              description="Verified 徽章牆 + 敬請期待位。"
            />
          }
        />
        <Route
          path="experts/:slug"
          element={
            <Placeholder
              eyebrow="Expert Profile"
              title="專家檔案"
              description="專屬配色 hero、成就佐證、授權透明度、AI 分身入口。"
            />
          }
        />
        <Route
          path="ask"
          element={
            <Placeholder
              eyebrow="Ask 問答"
              title="AI 編輯部對話"
              description="引用 chips、免費額度條、打字機、升級 CTA。"
            />
          }
        />
        <Route
          path="pricing"
          element={
            <Placeholder
              eyebrow="Pricing 方案"
              title="方案 Pricing"
              description="免費/進階/VIP 三層方案（金色僅 VIP）+ 月費/年費切換 + FAQ。"
            />
          }
        />
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
  );
}
