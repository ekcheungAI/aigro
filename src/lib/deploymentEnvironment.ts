export interface DeploymentHtmlTag {
  tag: "meta";
  attrs: {
    name: "robots" | "googlebot";
    content: string;
  };
  injectTo: "head-prepend";
}

export const AIGRO_PRODUCTION_PROJECT_ID = "prj_KalOtSafgqvhUed00WVPIIIHXDp0";
export const AIGRO_BETA_PROJECT_ID = "prj_lUZVc3AOhuqvH2ZmaUxRvL78zQ5G";
export const AIGRO_PRODUCTION_SUPABASE_URL = "https://zpdwalqnhkbxhmaagkfc.supabase.co";

export interface DeploymentContractInput {
  vercel?: string;
  vercelProjectId?: string;
  vercelProjectName?: string;
  deployEnvironment?: string;
  siteUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  turnstileSiteKey?: string;
  chatRollout?: string;
}

function normalized(value?: string): string {
  return value?.trim() ?? "";
}

function isConfigured(value?: string): boolean {
  const candidate = normalized(value);
  return candidate.length > 0
    && !/^(?:your-|replace-|example|changeme)/i.test(candidate);
}

function isHttpsSupabaseUrl(value?: string): boolean {
  try {
    const parsed = new URL(normalized(value));
    return parsed.protocol === "https:"
      && /^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname)
      && parsed.username === ""
      && parsed.password === "";
  } catch {
    return false;
  }
}

/** Fail closed when a Vercel project and its frontend/backend channel disagree. */
export function assertDeploymentContract(input: DeploymentContractInput): void {
  const projectId = normalized(input.vercelProjectId);
  const projectName = normalized(input.vercelProjectName).toLowerCase();
  const deployEnvironment = normalized(input.deployEnvironment).toLowerCase();
  const siteUrl = normalized(input.siteUrl).replace(/\/$/, "");
  const supabaseUrl = normalized(input.supabaseUrl).replace(/\/$/, "");
  const isVercelBuild = normalized(input.vercel) === "1" || Boolean(projectId || projectName);
  const projectKind = projectId
    ? projectId === AIGRO_BETA_PROJECT_ID
      ? "beta"
      : projectId === AIGRO_PRODUCTION_PROJECT_ID
        ? "production"
        : undefined
    : projectName === "aigro-beta"
      ? "beta"
      : projectName === "aigro"
        ? "production"
        : undefined;
  const isBetaProject = projectKind === "beta";
  const isProductionProject = projectKind === "production";

  if (isVercelBuild && !projectKind) {
    throw new Error("deployment_contract_unknown_vercel_project");
  }
  if (projectName && (
    (isBetaProject && projectName !== "aigro-beta")
    || (isProductionProject && projectName !== "aigro")
  )) {
    throw new Error("deployment_contract_vercel_project_name_mismatch");
  }
  if (isBetaProject && deployEnvironment !== "beta") {
    throw new Error("deployment_contract_beta_identity_mismatch");
  }
  if (isProductionProject && deployEnvironment !== "production") {
    throw new Error("deployment_contract_production_identity_mismatch");
  }

  if (deployEnvironment === "beta") {
    if (siteUrl !== "https://beta.aigro.io") {
      throw new Error("deployment_contract_beta_site_url_required");
    }
    if (!isHttpsSupabaseUrl(supabaseUrl)
      || supabaseUrl === AIGRO_PRODUCTION_SUPABASE_URL) {
      throw new Error("deployment_contract_isolated_beta_supabase_required");
    }
    if (!isConfigured(input.supabaseAnonKey)) {
      throw new Error("deployment_contract_beta_publishable_key_required");
    }
    if (!isConfigured(input.turnstileSiteKey)) {
      throw new Error("deployment_contract_beta_turnstile_key_required");
    }
    if (normalized(input.chatRollout).toLowerCase() !== "true") {
      throw new Error("deployment_contract_beta_chat_rollout_required");
    }
  }

  if (isProductionProject) {
    if (siteUrl !== "https://aigro.io") {
      throw new Error("deployment_contract_production_site_url_required");
    }
    if (supabaseUrl !== AIGRO_PRODUCTION_SUPABASE_URL) {
      throw new Error("deployment_contract_production_supabase_required");
    }
    if (!isConfigured(input.supabaseAnonKey)) {
      throw new Error("deployment_contract_production_publishable_key_required");
    }
    if (normalized(input.chatRollout).toLowerCase() === "true"
      && !isConfigured(input.turnstileSiteKey)) {
      throw new Error("deployment_contract_production_turnstile_key_required");
    }
  }
}

export function deploymentRobotsTags(deployEnvironment?: string): DeploymentHtmlTag[] {
  if (deployEnvironment?.trim().toLowerCase() !== "beta") return [];

  const content = "noindex, nofollow, noarchive";
  return [
    {
      tag: "meta",
      attrs: { name: "robots", content },
      injectTo: "head-prepend",
    },
    {
      tag: "meta",
      attrs: { name: "googlebot", content },
      injectTo: "head-prepend",
    },
  ];
}
