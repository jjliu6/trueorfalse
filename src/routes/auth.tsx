import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Backdrop } from "@/components/tof/Backdrop";
import { useSession } from "@/hooks/useSession";
import { useLang } from "@/lib/i18n";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? (search["redirect"] as string) : undefined,
  }),
  head: () =>
    seo({
      title: "主持人登录 · TRUE or FALSE 真真假假",
      description: "主持人注册登录后即可保存对局记录、导出战报图并回看历史榜单。",
      path: "/auth",
      // 登录页无需被索引
      noindex: true,
    }),
  component: AuthPage,
});

function safePath(raw: string | undefined) {
  if (!raw) return "/history";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/history";
}

function AuthPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { redirect } = Route.useSearch();
  const { session, ready } = useSession();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !session) return;
    const dest = safePath(redirect);
    // redirect 可能带着 ?k=... 这样的查询串（比如从大屏榜单页跳过来的），
    // 用 TanStack 的 navigate({to}) 传一个带 query 的原始字符串不保证能正确解析，
    // 直接用真实跳转最保险
    if (dest.includes("?")) window.location.assign(dest);
    else void navigate({ to: dest, replace: true });
  }, [ready, session, redirect, navigate]);

  const submit = async () => {
    setBusy(true);
    setErr("");
    setMsg("");
    if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pw,
        options: {
          // 不能只跳回首页——那样确认完邮箱又得重新找回刚才那场游戏。
          // 带上 redirect，确认链接点开后 useSession 认出登录态，会自动把人送回原来的页面
          emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(safePath(redirect))}`,
        },
      });
      setBusy(false);
      if (error) return setErr(error.message);
      if (!data.session) return setMsg(t("auth.msg.signupSent"));
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) setErr(error.message);
  };

  return (
    <>
      <Backdrop />
      <main className="phone-root">
        <div className="pstep">
          <div>
            <h1 className="wordmark" style={{ fontSize: 32 }}>
              <span className="t">{t("auth.title.host")}</span>
              <span className="or">·</span>
              <span className="f">{t("auth.title.login")}</span>
            </h1>
            <div className="sub-cn" style={{ fontSize: 12 }}>
              {t("auth.sub")}
            </div>
          </div>
          <p className="pdesc">
            {t("auth.desc.pre")}
            <b style={{ color: "var(--ink)" }}>{t("auth.desc.bold")}</b>
            {t("auth.desc.post")}
          </p>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`btn ghost${mode === "in" ? " sel" : ""}`}
              onClick={() => setMode("in")}
            >
              {t("auth.mode.in")}
            </button>
            <button
              className={`btn ghost${mode === "up" ? " sel" : ""}`}
              onClick={() => setMode("up")}
            >
              {t("auth.mode.up")}
            </button>
          </div>

          <div className="field">
            <label htmlFor="email">{t("auth.email.label")}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label htmlFor="pw">{t("auth.pw.label")}</label>
            <input
              id="pw"
              type="password"
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
              placeholder={t("auth.pw.placeholder")}
            />
          </div>

          {err && (
            <p className="pdesc" style={{ color: "var(--fake)" }}>
              {err}
            </p>
          )}
          {msg && (
            <p className="pdesc" style={{ color: "var(--true, #34d399)" }}>
              {msg}
            </p>
          )}

          <button
            className="btn"
            disabled={busy || !email.trim() || pw.length < 6}
            onClick={() => void submit()}
          >
            {mode === "up" ? t("auth.submit.up") : t("auth.submit.in")}
          </button>

          <div style={{ flex: 1 }} />
          <Link to="/" className="btn ghost" style={{ textAlign: "center", lineHeight: "1.2" }}>
            {t("auth.back")}
          </Link>
        </div>
      </main>
    </>
  );
}
