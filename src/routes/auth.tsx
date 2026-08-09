import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Backdrop } from "@/components/tof/Backdrop";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? (search["redirect"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "主持人登录 · TRUE or FALSE 真真假假" },
      { name: "description", content: "主持人注册登录后即可保存对局记录、导出战报图并回看历史榜单。" },
      { property: "og:title", content: "主持人登录 · TRUE or FALSE" },
      { property: "og:description", content: "登录后保存对局记录、导出战报图、回看历史榜单。" },
    ],
  }),
  component: AuthPage,
});

function safePath(raw: string | undefined) {
  if (!raw) return "/history";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/history";
}

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { session, ready } = useSession();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && session) void navigate({ to: safePath(redirect), replace: true });
  }, [ready, session, redirect, navigate]);

  const submit = async () => {
    setBusy(true);
    setErr("");
    setMsg("");
    if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pw,
        options: { emailRedirectTo: window.location.origin },
      });
      setBusy(false);
      if (error) return setErr(error.message);
      if (!data.session) return setMsg("注册邮件已发出，点开邮箱里的确认链接就能登录。");
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
              <span className="t">主持人</span>
              <span className="or">·</span>
              <span className="f">登录</span>
            </h1>
            <div className="sub-cn" style={{ fontSize: 12 }}>
              保存记录 · 导出战报 · 回看历史
            </div>
          </div>
          <p className="pdesc">
            玩游戏不需要登录。只有<b>保存对局记录、导出战报图、回看历史榜单</b>需要一个账号。
          </p>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`btn ghost${mode === "in" ? " sel" : ""}`}
              onClick={() => setMode("in")}
            >
              登录
            </button>
            <button
              className={`btn ghost${mode === "up" ? " sel" : ""}`}
              onClick={() => setMode("up")}
            >
              注册
            </button>
          </div>

          <div className="field">
            <label htmlFor="email">邮箱</label>
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
            <label htmlFor="pw">密码</label>
            <input
              id="pw"
              type="password"
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
              placeholder="至少 6 位"
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
            {mode === "up" ? "注册并登录 →" : "登录 →"}
          </button>

          <div style={{ flex: 1 }} />
          <Link to="/" className="btn ghost" style={{ textAlign: "center", lineHeight: "1.2" }}>
            ← 回首页
          </Link>
        </div>
      </main>
    </>
  );
}