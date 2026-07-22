import { Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
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
  );
}
