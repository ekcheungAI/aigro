import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const MEMBER_BASE_COUNT = 110;

/** Adds the latest public registered-member aggregate to AIGRO's 110-member baseline. */
export default function usePublicMemberCount(): number {
  const [count, setCount] = useState(MEMBER_BASE_COUNT);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    void supabase.rpc("get_public_member_count").then(({ data, error }) => {
      const parsed = typeof data === "number" ? data : Number(data);
      if (active && !error && Number.isSafeInteger(parsed) && parsed >= 0) {
        setCount(MEMBER_BASE_COUNT + parsed);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return count;
}
