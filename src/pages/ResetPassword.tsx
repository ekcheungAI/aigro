import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Loader2, LockKeyhole } from "lucide-react";
import Field from "@/components/auth/Field";
import { updatePassword } from "@/components/auth/member";
import { supabase, supabaseReady } from "@/lib/supabase";

type RecoveryState = "checking" | "ready" | "invalid" | "saving" | "success";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [state, setState] = useState<RecoveryState>(() =>
    supabase && supabaseReady ? "checking" : "invalid"
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !supabaseReady) return;
    let recoveryEvent = false;
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryEvent = true;
        setState("ready");
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!recoveryEvent) setState(data.session ? "ready" : "invalid");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setError("新密碼最少 8 個字元");
      return;
    }
    if (password !== confirmPassword) {
      setError("兩次輸入嘅密碼唔一致");
      return;
    }
    setState("saving");
    const result = await updatePassword(password);
    if (!result.ok) {
      setState("ready");
      setError(result.error ?? "暫時未能更新密碼，請重新申請重設連結。");
      return;
    }
    setState("success");
    window.setTimeout(() => navigate("/login"), 900);
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center px-6 py-16 md:py-24">
      <div className="w-full rounded-md border bg-surface p-8 md:p-10">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-lime-soft text-ink">
          <LockKeyhole className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-h3 text-text-primary">設定新密碼</h1>

        {state === "checking" && (
          <p className="mt-4 inline-flex items-center gap-2 text-body-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" strokeWidth={1.5} />
            正在驗證重設連結…
          </p>
        )}

        {state === "invalid" && (
          <div className="mt-5">
            <p className="text-body-sm text-text-secondary">
              呢條重設連結已失效或唔完整，請重新申請。
            </p>
            <Link to="/login" className="press mt-5 inline-flex h-11 items-center rounded-md bg-lime px-5 text-label text-on-accent">
              返回登入
            </Link>
          </div>
        )}

        {(state === "ready" || state === "saving") && (
          <form
            className="mt-6 grid gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Field
              id="reset-password"
              label="新密碼"
              type="password"
              autoComplete="new-password"
              hint="最少 8 個字元"
              value={password}
              error={error}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Field
              id="reset-password-confirm"
              label="再次輸入新密碼"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <button
              type="submit"
              disabled={state === "saving"}
              className="press inline-flex h-12 items-center justify-center gap-2 rounded-md bg-lime px-5 text-label text-on-accent disabled:opacity-60"
            >
              {state === "saving" && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" strokeWidth={1.5} />}
              {state === "saving" ? "更新中…" : "更新密碼"}
            </button>
          </form>
        )}

        {state === "success" && (
          <p className="mt-5 inline-flex items-center gap-2 text-body-sm text-ink" role="status">
            <Check className="h-4 w-4" strokeWidth={2} />
            密碼已更新，正在返回登入頁。
          </p>
        )}
      </div>
    </div>
  );
}
