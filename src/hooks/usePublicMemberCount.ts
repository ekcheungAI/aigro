import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** Reads only the aggregate public count; individual member profiles stay private. */
export default function usePublicMemberCount(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    void supabase.rpc("public_member_count").then(({ data, error }) => {
      const parsed = typeof data === "number" ? data : Number(data);
      if (active && !error && Number.isSafeInteger(parsed) && parsed >= 0) {
        setCount(parsed);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return count;
}
