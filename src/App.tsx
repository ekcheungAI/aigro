import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import usePageMeta from "@/hooks/usePageMeta";
import { EXPERT_CHAT_ROLLOUT_ENABLED } from "@/data/navigation";
import { getRouteMeta } from "@/lib/routeMeta";

const Home = lazy(() => import("@/pages/Home"));
const Insights = lazy(() => import("@/pages/Insights"));
const Daily = lazy(() => import("@/pages/Daily"));
const InsightDetail = lazy(() => import("@/pages/InsightDetail"));
const Cases = lazy(() => import("@/pages/Cases"));
const CaseDetail = lazy(() => import("@/pages/CaseDetail"));
const FeatureUnavailable = lazy(() => import("@/pages/FeatureUnavailable"));
const Ask = lazy(() => import("@/pages/Ask"));
const Experts = lazy(() => import("@/pages/Experts"));
const ExpertProfile = lazy(() => import("@/pages/ExpertProfile"));
const Developers = lazy(() => import("@/pages/Developers"));
const Account = lazy(() => import("@/pages/Account"));
const Skills = lazy(() => import("@/pages/Skills"));
const PublicApis = lazy(() => import("@/pages/PublicApis"));
const Sources = lazy(() => import("@/pages/Sources"));
const Access = lazy(() => import("@/pages/Access"));
const Branding = lazy(() => import("@/pages/Branding"));
const ClassReview = lazy(() => import("@/pages/ClassReview"));
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
  const activeMeta = getRouteMeta(pathname, search);
  const isNotFound = !activeMeta;
  usePageMeta(
    isNotFound ? "找不到頁面" : activeMeta.title,
    isNotFound
      ? "此頁面不存在或已移除。返回 AIGRO 瀏覽最新 AI・增長情報。"
      : activeMeta.description,
    pathname === "/"
      ? {
          canonical: "/",
          ogTitle: "香港 #1 AI Builder 社群｜AIGRO",
          ogImage: "/og-image.png",
          ogImageAlt: "AIGRO 香港 #1 AI Builder 社群",
        }
      : undefined
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

function SkillsRoute() {
  const { search } = useLocation();
  if (new URLSearchParams(search).get("tab") === "apis") {
    return <Navigate to="/apis" replace />;
  }
  return <Skills />;
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
          path="experts/:slug"
          element={EXPERT_CHAT_ROLLOUT_ENABLED ? <ExpertProfile /> : (
            <FeatureUnavailable
              eyebrow="Experts · 暫未開放"
              title="領航專家平台即將開放"
              description="我哋正完成專家授權、資料核實同預約流程。正式開放前，公開專家名單及個人頁暫時封鎖。"
              betaMessage="而家免費註冊，Experts 進入 Beta 時會列入首批開放名單，優先收到專家平台測試邀請。"
              screenshotSrc="/previews/experts-product.jpg"
              screenshotAlt="AIGRO 領航專家平台產品預覽，展示已認證專家資料卡"
              screenshotPosition="center top"
            />
          )}
        />
        <Route
          path="experts"
          element={EXPERT_CHAT_ROLLOUT_ENABLED ? <Experts /> : (
            <FeatureUnavailable
              eyebrow="Experts · 暫未開放"
              title="領航專家平台即將開放"
              description="我哋正完成專家授權、資料核實同預約流程。正式開放前，公開專家名單及個人頁暫時封鎖。"
              betaMessage="而家免費註冊，Experts 進入 Beta 時會列入首批開放名單，優先收到專家平台測試邀請。"
              screenshotSrc="/previews/experts-product.jpg"
              screenshotAlt="AIGRO 領航專家平台產品預覽，展示已認證專家資料卡"
              screenshotPosition="center top"
            />
          )}
        />
        <Route
          path="ask"
          element={EXPERT_CHAT_ROLLOUT_ENABLED ? <Ask /> : (
            <FeatureUnavailable
              eyebrow="Ask · 暫未開放"
              title="AI 問答功能準備中"
              description="我哋正完成答案來源、知識授權同品質檢查。Ask 問答會喺準備好之後重新開放。"
              betaMessage="而家免費註冊，Ask 進入 Beta 時會列入首批開放名單，優先收到 AI 問答測試邀請。"
              screenshotSrc="/previews/ask-product.jpg"
              screenshotAlt="AIGRO Ask AI 問答產品預覽，展示分身選擇、對話介面及來源資料"
              screenshotPosition="center top"
            />
          )}
        />
        <Route path="pricing" element={<Navigate to="/join" replace />} />
        <Route path="developers" element={<Developers />} />
        <Route path="skills" element={<SkillsRoute />} />
        <Route path="apis" element={<PublicApis />} />
        <Route path="branding" element={<Branding />} />
        <Route path="class-review" element={<ClassReview />} />
        <Route path="guides" element={<Navigate to="/class-review" replace />} />
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
