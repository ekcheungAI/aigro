import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import usePageMeta from "@/hooks/usePageMeta";

const Home = lazy(() => import("@/pages/Home"));
const Insights = lazy(() => import("@/pages/Insights"));
const Daily = lazy(() => import("@/pages/Daily"));
const InsightDetail = lazy(() => import("@/pages/InsightDetail"));
const Cases = lazy(() => import("@/pages/Cases"));
const CaseDetail = lazy(() => import("@/pages/CaseDetail"));
const FeatureUnavailable = lazy(() => import("@/pages/FeatureUnavailable"));
const Developers = lazy(() => import("@/pages/Developers"));
const Account = lazy(() => import("@/pages/Account"));
const Skills = lazy(() => import("@/pages/Skills"));
const Sources = lazy(() => import("@/pages/Sources"));
const Access = lazy(() => import("@/pages/Access"));
const Branding = lazy(() => import("@/pages/Branding"));
const GrowthMarketerGuide = lazy(() => import("@/pages/GrowthMarketerGuide"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const UXPreview = lazy(() => import("@/pages/UXPreview"));
const Placeholder = lazy(() => import("@/pages/Placeholder"));
const AdminLayout = lazy(() => import("@/components/admin/AdminLayout"));
const Dashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminExperts = lazy(() => import("@/pages/admin/AdminExperts"));
const AdminContent = lazy(() => import("@/pages/admin/AdminContent"));
const AdminEngagement = lazy(() => import("@/pages/admin/AdminEngagement"));
const AdminMembers = lazy(() => import("@/pages/admin/AdminMembers"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminEmails = lazy(() => import("@/pages/admin/AdminEmails"));
const AdminSkills = lazy(() => import("@/pages/admin/AdminSkills"));
const AdminSources = lazy(() => import("@/pages/admin/AdminSources"));
const AdminStudio = lazy(() => import("@/pages/admin/AdminStudio"));
const AdminCRM = lazy(() => import("@/pages/admin/AdminCRM"));
const PortalLayout = lazy(() => import("@/components/portal/PortalLayout"));
const PortalHome = lazy(() => import("@/pages/portal/PortalHome"));
const PortalKB = lazy(() => import("@/pages/portal/PortalKB"));
const PortalInsights = lazy(() => import("@/pages/portal/PortalInsights"));
const PortalProfile = lazy(() => import("@/pages/portal/PortalProfile"));
const PortalSocials = lazy(() => import("@/pages/portal/PortalSocials"));
const PortalLeads = lazy(() => import("@/pages/portal/PortalLeads"));
const PortalBookings = lazy(() => import("@/pages/portal/PortalBookings"));

/** Per-page <title> + meta（v1.1 SEO 基建） */
function RouteMeta() {
  const { pathname, search } = useLocation();
  const map: [RegExp, string, string?][] = [
    [/^\/$/, "", ""],
    [/^\/insights\/daily/, "每日精選日報", "編輯部每日精選 5 條必讀 AI・增長情報 — 3 分鐘掌握全球脈搏的香港意義。"],
    [/^\/insights\/[^/]+/, "情報詳情", "AI 摘要 + 香港視角長評 + 來源連結。"],
    [/^\/insights/, "資訊中心 Insights", "即時動態 feed、每日日報、主題地圖與數據合作 — 每日 AI・增長情報，附香港視角解讀。"],
    [/^\/cases\/[^/]+/, "案例深度拆解", "背景 → 工具/方法 → 成果數據 → 可複製步驟。"],
    [/^\/cases/, "實戰案例 Cases", "香港本地 AI 落地案例庫 — 數據化成果，可複製的做法拆解。"],
    [/^\/experts\/[^/]+/, "專家檔案", "領航專家個人頁 — 成就佐證、授權透明度、AI 分身對話入口。"],
    [/^\/experts/, "領航專家 Experts", "由領航專家帶領嘅 growth hacking club — AI 分身基於授權內容蒸餾。"],
    [/^\/ask/, "Ask 問答", "問 AI 編輯部任何 AI、增長、營銷問題 — 命中已批准知識時顯示可核實來源。"],
    [/^\/developers/, "AIGRO MCP Network", "行業情報 MCP server — 你嘅 AI 工具一連接,即刻有行業雷達。AI 行業優先名單開放中。"],
    [/^\/sources/, "情報渠道", "AIGRO 情報渠道 — 公開透明嘅來源牆、數據流程與免費任用方式。"],
    [/^\/skills/, "Skills", "AIGRO Skills — 俾你嘅 AI agent 裝上專業能力。"],
    [/^\/branding/, "品牌指南 Branding", "AIGRO 品牌識別、標誌、色彩、字體、語氣與應用規範。"],
    [/^\/guides\/100x-ai-growth-marketer/, "100x AI Growth Marketer 公開課程導讀", "AIGRO Class Review：DotAI × EK（ekcheungAI）聯合策劃及教學，由 Company Brand Brain、5 位 AI 員工、多平台內容與 Sales Funnel，走到可持續改善嘅 AI Marketing OS。"],
    [/^\/ux-preview/, "UX Direction Preview", "AIGRO 全站體驗優化概念預覽。"],
    [/^\/access/, "全級別入口", "AIGRO 全級別入口 — 訪客、會員、創始會員、領航專家、管理員示範登入。"],
    [/^\/login/, "登入", "登入 AIGRO Club — 無限分身對話、完整案例拆解、MCP 優先接入。"],
    [/^\/join/, "免費加入 Club", "免費加入 AIGRO Club，成為創始會員，優先體驗 Ask、Experts、MCP 同導師 Live Chat。"],
    [/^\/reset-password/, "設定新密碼", "安全更新你嘅 AIGRO 帳號密碼。"],
    [/^\/account/, "會員專區", "你嘅 AIGRO 會員專區 — 層級、對話紀錄、MCP 名單與設定。"],
    [/^\/admin/, "AIGRO Admin", "內部管理後台。"],
    [/^\/portal\/kb/, "專家知識庫", "管理已授權嘅專家知識、來源與 AI 分身內容。"],
    [/^\/portal\/insights/, "專家數據洞察", "查看專家 AI 分身嘅內容與互動趨勢。"],
    [/^\/portal\/profile/, "專家資料設定", "管理專家公開資料與 AI 分身設定。"],
    [/^\/portal\/socials/, "社交渠道", "管理專家公開社交渠道。"],
    [/^\/portal\/leads/, "專家潛在客戶", "管理由 AIGRO 帶來嘅專家合作查詢。"],
    [/^\/portal\/bookings/, "專家預約", "管理專家諮詢與合作預約。"],
    [/^\/portal/, "領航專家平台", "AIGRO 領航專家嘅內容、分身與合作管理平台。"],
  ];
  const tab = pathname === "/insights" ? new URLSearchParams(search).get("tab") : null;
  const tabMeta: Record<string, [string, string]> = {
    daily: ["每日精選日報", "編輯部每日精選必讀 AI・增長情報 — 3 分鐘掌握全球脈搏的香港意義。"],
    weekly: ["每週回顧", "一週 AI・增長脈搏一次過睇晒，按分類整理編輯部必讀情報。"],
    topics: ["主題地圖", "按公司、模型與技術主題探索 AIGRO 情報庫。"],
    data: ["數據合作", "了解 AIGRO 情報來源、數據合作方式與 MCP 發展方向。"],
  };
  const hit = map.find(([re]) => re.test(pathname));
  const activeMeta: [string, string?] | undefined =
    tab && tabMeta[tab] ? tabMeta[tab] : hit ? [hit[1], hit[2]] : undefined;
  const isNotFound = !activeMeta;
  usePageMeta(
    isNotFound ? "找不到頁面" : activeMeta?.[0] || undefined,
    isNotFound ? "此頁面不存在或已移除。返回 AIGRO 瀏覽最新 AI・增長情報。" : activeMeta?.[1] || undefined
  );
  return null;
}

function AuthRouteRedirect({ mode }: { mode: "join" | "login" }) {
  const { search } = useLocation();
  const incoming = new URLSearchParams(search);
  const requested = incoming.get("next");
  const nextPath =
    requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  const modalSearch = new URLSearchParams({ auth: mode, next: nextPath });
  return <Navigate to={`${nextPath}?${modalSearch.toString()}`} replace />;
}

/**
 * Routing — nested-route pattern: Layout renders <Outlet/>, so ALL routes
 * are children of `<Route element={<Layout/>}` (never mix with children pattern).
 * 11 routes per design.md §8.
 */
export default function App() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] bg-bg" aria-label="載入頁面" />}>
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
          element={<Navigate to="/insights" replace />}
        />
        <Route
          path="experts/*"
          element={
            <FeatureUnavailable
              eyebrow="Experts · 暫未開放"
              title="領航專家平台即將開放"
              description="我哋正完成專家授權、資料核實同預約流程。正式開放前，公開專家名單及個人頁暫時封鎖。"
              betaMessage="而家免費註冊，Experts 進入 Beta 時會列入首批開放名單，優先收到專家平台測試邀請。"
              screenshotSrc="/previews/experts-product.jpg"
              screenshotAlt="AIGRO 領航專家平台產品預覽，展示已認證專家資料卡"
              screenshotPosition="center top"
            />
          }
        />
        <Route
          path="ask"
          element={
            <FeatureUnavailable
              eyebrow="Ask · 暫未開放"
              title="AI 問答功能準備中"
              description="我哋正完成答案來源、知識授權同品質檢查。Ask 問答會喺準備好之後重新開放。"
              betaMessage="而家免費註冊，Ask 進入 Beta 時會列入首批開放名單，優先收到 AI 問答測試邀請。"
              screenshotSrc="/previews/ask-product.jpg"
              screenshotAlt="AIGRO Ask AI 問答產品預覽，展示分身選擇、對話介面及來源資料"
              screenshotPosition="center top"
            />
          }
        />
        <Route path="pricing" element={<Navigate to="/join" replace />} />
        <Route path="developers" element={<Developers />} />
        <Route path="skills" element={<Skills />} />
        <Route path="branding" element={<Branding />} />
        <Route path="guides/100x-ai-growth-marketer" element={<GrowthMarketerGuide />} />
        <Route path="sources" element={<Sources />} />
        {/* /data 併入 Insights 數據合作 tab — 舊連結 redirect 唔會死 */}
        <Route
          path="data"
          element={<Navigate to="/insights?tab=data" replace />}
        />
        <Route path="access" element={<Access />} />
        <Route path="login" element={<AuthRouteRedirect mode="login" />} />
        <Route path="join" element={<AuthRouteRedirect mode="join" />} />
        <Route path="reset-password" element={<ResetPassword />} />
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
      <Route path="ux-preview" element={<UXPreview />} />
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="experts" element={<AdminExperts />} />
        <Route path="content" element={<AdminContent />} />
        <Route path="engagement" element={<AdminEngagement />} />
        <Route path="members" element={<AdminMembers />} />
        <Route path="studio" element={<AdminStudio />} />
        <Route path="crm" element={<AdminCRM />} />
        <Route path="emails" element={<AdminEmails />} />
        <Route path="skills" element={<AdminSkills />} />
        <Route path="sources" element={<AdminSources />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      <Route path="portal" element={<PortalLayout />}>
        <Route index element={<PortalHome />} />
        <Route path="kb" element={<PortalKB />} />
        <Route path="insights" element={<PortalInsights />} />
        <Route path="profile" element={<PortalProfile />} />
        <Route path="socials" element={<PortalSocials />} />
        <Route path="leads" element={<PortalLeads />} />
        <Route path="bookings" element={<PortalBookings />} />
      </Route>
      </Routes>
    </Suspense>
  );
}
