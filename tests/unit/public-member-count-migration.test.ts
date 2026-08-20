import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260820170000_restore_public_member_count_contract.sql"
);

describe("public member count database contract", () => {
  it("keeps one permanent-member aggregate and removes the inaccurate alias", () => {
    expect(existsSync(migrationPath)).toBe(true);
    if (!existsSync(migrationPath)) return;

    const sql = readFileSync(migrationPath, "utf8").toLowerCase();
    expect(sql).toContain("drop function if exists public.public_member_count()");
    expect(sql).toContain("create or replace function public.get_public_member_count()");
    expect(sql).toContain("not coalesce(u.is_anonymous, false)");
    expect(sql).toContain("grant execute on function public.get_public_member_count()");
  });
});
