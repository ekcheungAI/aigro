import { Navigate } from "react-router-dom";

/**
 * Case Detail — v1.27:示範案例全部係虛構,已移除。
 * 未有真實案例上架前,/cases/:slug 一律返回案例庫(誠實狀態頁)。
 */
export default function CaseDetail() {
  return <Navigate to="/cases" replace />;
}
