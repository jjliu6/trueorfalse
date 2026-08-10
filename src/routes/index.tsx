import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Backdrop } from "@/components/tof/Backdrop";
import { fetchRoomByCode, fetchSiteStats, makeCode, makeHostKey, type SiteStats } from "@/lib/tof";
import { useLang } from "@/lib/i18n";
import { seo, homeJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    seo({
      title: "TRUE or FALSE · 真真假假 | 线上破冰派对游戏",
      description:
        "真真假假（Two Truths and a Lie）线上版：每人写一真一假两个故事，其他人猜哪个是真的。手机输入房间码即加入，大屏投影，10 人约 25 分钟，免费无需下载 —— 聚会、团建、Hackathon 破冰首选。",
      path: "/",
    }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<SiteStats | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchSiteStats().then((s) => alive && setStats(s));

    // 有新玩家提交时重新拉一次统计——"局数"取决于哪些房间有人提交过，
    // 不是简单 +1 能算对的，所以直接重新查一次，量级很小，不用担心开销
    const channel = supabase
      .channel("home-stats")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "players" }, () => {
        void fetchSiteStats().then((s) => alive && setStats(s));
      })
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const join = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    setErr("");
    const room = await fetchRoomByCode(c);
    setBusy(false);
    if (!room) {
      setErr(t("home.err.notfound"));
      return;
    }
    void navigate({ to: "/play/$code", params: { code: c } });
  };

  const createRoom = async () => {
    setBusy(true);
    setErr("");
    const hostKey = makeHostKey();
    // code 是 unique 的，撞了就换一个再试，别让用户看见"创建失败"
    for (let attempt = 0; attempt < 5; attempt++) {
      const newCode = makeCode();
      // 建房间、写 host_key 在数据库那一侧一次性原子完成——
      // 不这样的话，两次 insert 中间的网络往返就是个竞态窗口，
      // 谁抢着先给这个房间插一条 host_key 就算谁的
      const { data, error } = await supabase.rpc("create_room_with_host", {
        p_code: newCode,
        p_key: hostKey,
      });
      if (data && !error) {
        setBusy(false);
        void navigate({ to: "/screen/$code", params: { code: newCode }, search: { k: hostKey } });
        return;
      }
      // 23505 = unique_violation，只有撞码才值得重试
      if (error?.code !== "23505") break;
    }
    setBusy(false);
    setErr(t("home.err.create"));
  };

  return (
    <>
      {/* GEO：给生成式 AI 引擎（ChatGPT / Perplexity / Gemini）的结构化事实，
          让它们能准确概括“怎么玩、几人、多久、免费”并在回答里引用本站。 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd()) }}
      />
      <Backdrop />
      <main className="phone-root">
        <div className="pstep">
          <div className="home-main">
            <div>
              <h1 className="wordmark" style={{ fontSize: 40 }}>
                <span className="t">TRUE</span>
                <span className="or">or</span>
                <span className="f">FALSE</span>
              </h1>
              <div className="sub-cn" style={{ fontSize: 13 }}>
                {t("home.title.sub")}
              </div>
              {stats && (
                <div
                  style={{
                    display: "flex",
                    gap: 18,
                    marginTop: 14,
                    fontSize: 12.5,
                    color: "var(--muted, rgba(255,255,255,.6))",
                  }}
                >
                  <span>{t("home.stats.rooms", { n: stats.rooms })}</span>
                  <span>{t("home.stats.players", { n: stats.players })}</span>
                </div>
              )}
            </div>
            <p className="pdesc" style={{ whiteSpace: "pre-line" }}>
              {t("home.desc")}
            </p>
            <div className="field">
              <label htmlFor="code">{t("home.code.label")}</label>
              <input
                id="code"
                value={code}
                autoCapitalize="characters"
                placeholder={t("home.code.placeholder")}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && void join()}
                style={{ letterSpacing: ".18em", fontWeight: 800, fontSize: 20 }}
              />
            </div>
            {err && (
              <p className="pdesc" style={{ color: "var(--fake)" }}>
                {err}
              </p>
            )}
            <button className="btn" disabled={busy || !code.trim()} onClick={() => void join()}>
              {t("home.join")}
            </button>
            <Link className="minibtn" to="/demo" style={{ justifyContent: "center" }}>
              {t("home.demo")}
            </Link>
          </div>
          <div className="home-footer">
            <button className="btn ghost" disabled={busy} onClick={() => void createRoom()}>
              {t("home.host")}
            </button>
            <a className="minibtn" href="/history" style={{ justifyContent: "center" }}>
              {t("home.host.login")}
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
