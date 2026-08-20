export type ApiCorsStatus = "yes" | "no" | "unknown";
export type ApiDirectoryStatus = "draft" | "published" | "hidden";
export type ApiSourceKind = "public-apis" | "manual" | "data-gov-hk";
export type ApiReviewState =
  | "upstream_listed"
  | "aigro_reviewed"
  | "live_check_passed";
export type ApiHkRelevance = "high" | "medium" | "low";

export interface PublicApiEntry {
  id: string;
  name: string;
  descriptionEn: string;
  editorialSummaryZhHk: string;
  category: string;
  useCases: string[];
  authType: string;
  httpsSupported: boolean;
  corsStatus: ApiCorsStatus;
  docsUrl: string;
  hkRelevance: ApiHkRelevance;
  sourceKind: ApiSourceKind;
  sourceUrl: string | null;
  upstreamRef: string | null;
  reviewState: ApiReviewState;
  lastReviewedAt: string | null;
  updatedAt: string;
}

export interface AdminPublicApiEntry extends PublicApiEntry {
  sourceKey: string;
  status: ApiDirectoryStatus;
  hiddenAt: string | null;
  hiddenBy: string | null;
  createdAt: string;
}

export interface PublicApiFilters {
  query?: string;
  category?: string | null;
  authType?: string | null;
  corsStatus?: ApiCorsStatus | null;
  httpsOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface PublicApiPage {
  entries: PublicApiEntry[];
  total: number;
}

export interface PublicApiCategory {
  category: string;
  entryCount: number;
}

export interface AdminPublicApiInput {
  name: string;
  descriptionEn: string;
  editorialSummaryZhHk: string;
  category: string;
  useCases: string[];
  authType: string;
  httpsSupported: boolean;
  corsStatus: ApiCorsStatus;
  docsUrl: string;
  hkRelevance: ApiHkRelevance;
}

export interface PublicApiRpcArgs {
  p_query: string | null;
  p_category: string | null;
  p_auth_type: string | null;
  p_cors_status: ApiCorsStatus | null;
  p_https: boolean | null;
  p_limit: number;
  p_offset: number;
}
