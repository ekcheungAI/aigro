import { supabase } from "@/lib/supabase";

export type ArgroSourceAction = "upsert" | "set_active" | "archive";

export interface ArgroSourceMutation {
  action?: ArgroSourceAction;
  sourceId?: string;
  name?: string;
  type?: "rss" | "api" | "scraper";
  endpoint?: string;
  vertical?: string;
  lang?: string;
  weight?: number;
  isActive?: boolean;
}

/**
 * Mutate the Argro source registry through the admin-only same-origin proxy.
 * The browser never receives or forwards ARGRO_API_KEY/SUPABASE_SECRET_KEY.
 */
export async function mutateArgroSource(
  mutation: ArgroSourceMutation,
  signal?: AbortSignal,
): Promise<{ ok: true; source?: { id: string; name: string } }> {
  if (!supabase) throw new Error("Supabase 未連接");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("需要管理員登入");

  const response = await fetch("/api/argro-source", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mutation),
    signal,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    source?: { id: string; name: string };
  };
  if (!response.ok || payload.ok !== true) {
    throw new Error(payload.error ?? `HTTP ${response.status}`);
  }
  return { ok: true, source: payload.source };
}
