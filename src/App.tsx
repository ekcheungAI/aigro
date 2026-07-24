import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import usePageMeta from "@/hooks/usePageMeta";
import Home from "@/pages/Home";
import Insights from "@/pages/Insights";
import Daily from "@/pages/Daily";
import InsightDetail from "@/pages/InsightDetail";
import Cases from "@/pages/Cases";
import CaseDetail from "@/pages/CaseDetail";
import Experts from "@/pages/Experts";
import ExpertProfile from "@/pages/ExpertProfile";
import Ask from "@/pages/Ask";
import Pricing from "@/pages/Pricing";
import Developers from "@/pages/Developers";
import Login from "@/pages/Login";
import Join from "@/pages/Join";
import Account from "@/pages/Account";
import AdminLayout from "@/components/admin/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import AdminExperts from "@/pages/admin/AdminExperts";
import AdminContent from "@/pages/admin/AdminContent";
import AdminEngagement from "@/pages/admin/AdminEngagement";
import AdminMembers from "@/pages/admin/AdminMembers";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminEmails from "@/pages/admin/AdminEmails";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalHome from "@/pages/portal/PortalHome";
import PortalKB from "@/pages/portal/PortalKB";
import PortalInsights from "@/pages/portal/PortalInsights";
import PortalProfile from "@/pages/portal/PortalProfile";
import PortalSocials from "@/pages/portal/PortalSocials";
import PortalLeads from "@/pages/portal/PortalLeads";
import AdminStudio from "@/pages/admin/AdminStudio";
import AdminCRM from "@/pages/admin/AdminCRM";
import Placeholder from "@/pages/Placeholder";

/** Per-page <title> + meta（v1.1 SEO 基建） */
function RouteMeta() {
  const { pathname } = useLocation();
  const map: [RegExp, string, string?][] = [
    [/^\/$/, "", ""],
    [/^\/insights\/daily/, "每日精選日報", "編輯部每日精選 5 條必讀 AI・增長情報 — 3 分鐘掌握全球脈搏的香港意義。"],
    [/^\/insights\/[^/]+/, "情報詳情", "AI 摘要 + 香港視角長評 + 來源連結。"],
    [/^\/insights/, "資訊中心 Insights", "即時動態 feed、每日日報、主題地圖與資源庫 — 每日 AI・增長情報，附香港視角解讀。"],
    [/^\/cases\/[^/]+/, "案例深度拆解", "背景 → 工具/方法 → 成果數據 → 可複製步驟。"],
    [/^\/cases/, "實戰案例 Cases", "香港本地 AI 落地案例庫 — 數據化成果，可複製的做法拆解。"],
    [/^\/experts\/[^/]+/, "專家檔案", "領航專家個人頁 — 成就佐證、授權透明度、AI 分身對話入口。"],
    [/^\/experts/, "領航專家 Experts", "由領航專家帶領嘅 growth hacking club — AI 分身基於授權內容蒸餾。"],
    [/^\/ask/, "Ask 問答", "問 AI 編輯部任何 AI、增長、營銷問題 — 每個論點附來源引用。"],
    [/^\/pricing/, "方案 Pricing", "免費/進階/VIP 三層會員方案 — 解鎖無限 AI 對話與領航專家分身。"],
    [/^\/developers/, "AIGRO MCP Network", "行業情報 MCP server — 你嘅 AI 工具一連接,即刻有行業雷達。AI 行業優先名單開放中。"],
    [/^\/login/, "登入", "登入 AIGRO Club — 無限分身對話、完整案例拆解、MCP 優先接入。"],
    [/^\/join/, "加入 Club", "加入 AIGRO Club — 三步成為會員,免費開始,隨時升級。"],
    [/^\/account/, "會員專區", "你嘅 AIGRO 會員專區 — 層級、對話紀錄、MCP 名單與設定。"],
    [/^\/admin/, "AIGRO Admin", "內部管理後台。"],
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
        <Route
          path="library"
          element={<Navigate to="/insights?tab=library" replace />}
        />
        <Route path="experts" element={<Experts />} />
        <Route path="experts/:slug" element={<ExpertProfile />} />
        <Route path="ask" element={<Ask />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="developers" element={<Developers />} />
        <Route path="login" element={<Login />} />
        <Route path="join" element={<Join />} />
        <Route path="account" element={<Account />} />
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
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="experts" element={<AdminExperts />} />
        <Route path="content" element={<AdminContent />} />
        <Route path="engagement" element={<AdminEngagement />} />
        <Route path="members" element={<AdminMembers />} />
        <Route path="studio" element={<AdminStudio />} />
        <Route path="crm" element={<AdminCRM />} />
        <Route path="emails" element={<AdminEmails />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      <Route path="portal" element={<PortalLayout />}>
        <Route index element={<PortalHome />} />
        <Route path="kb" element={<PortalKB />} />
        <Route path="insights" element={<PortalInsights />} />
        <Route path="profile" element={<PortalProfile />} />
        <Route path="socials" element={<PortalSocials />} />
        <Route path="leads" element={<PortalLeads />} />
      </Route>
      </Routes>
    </>
  );
}
