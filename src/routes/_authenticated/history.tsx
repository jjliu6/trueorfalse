import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Backdrop } from "@/components/tof/Backdrop";
import { BoardView } from "@/components/tof/BoardView";
import { isSnapshot, type GameSnapshot } from "@/lib/records";
import { localeOf, useLang } from "@/lib/i18n";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/history")({
  head: () =>
    seo({
      title: "历史记录 · TRUE or FALSE 真真假假",
      description: "回看保存过的每一场真真假假对局榜单与故事。",
      path: "/history",
      // 私人对局历史，不应被索引
      noindex: true,
    }),
  component: HistoryPage,
});

type Row = {
  id: string;
  room_code: string;
  title: string | null;
  played_at: string;
  snapshot: unknown;
};

function HistoryPage() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("game_records")
      .select("id, room_code, title, played_at, snapshot")
      .order("played_at", { ascending: false });
    setRows((data as Row[] | null) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string) => {
    await supabase.from("game_records").delete().eq("id", id);
    if (openId === id) setOpenId(null);
    void load();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/", replace: true });
  };

  const open = rows?.find((r) => r.id === openId);
  const snap: GameSnapshot | null = open && isSnapshot(open.snapshot) ? open.snapshot : null;

  return (
    <>
      <Backdrop />
      <main className="hist-root">
        <header className="hist-top">
          <div>
            <h1 className="wordmark" style={{ fontSize: 26 }}>
              <span className="t">{t("history.title.a")}</span>
              <span className="or">·</span>
              <span className="f">{t("history.title.b")}</span>
            </h1>
            <div className="sub-cn" style={{ fontSize: 11 }}>
              {t("history.sub")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link to="/" className="minibtn">
              {t("history.home")}
            </Link>
            <button className="minibtn" onClick={() => void signOut()}>
              {t("history.signout")}
            </button>
          </div>
        </header>

        {rows === null && <p className="pdesc">{t("history.loading")}</p>}
        {rows?.length === 0 && <p className="pdesc">{t("history.empty")}</p>}

        <div className="hist-list">
          {rows?.map((r) => (
            <div key={r.id} className="hist-item">
              <div>
                <div className="hist-title">
                  {r.title || t("history.item.title", { code: r.room_code })}
                </div>
                <div className="hist-meta">
                  {new Date(r.played_at).toLocaleString(localeOf(lang))} · {r.room_code} ·{" "}
                  {t("history.item.meta", {
                    n: isSnapshot(r.snapshot) ? r.snapshot.players.length : 0,
                  })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="minibtn"
                  onClick={() => setOpenId(openId === r.id ? null : r.id)}
                >
                  {openId === r.id ? t("history.collapse") : t("history.view")}
                </button>
                <button className="minibtn danger" onClick={() => void remove(r.id)}>
                  {t("history.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>

        {snap && (
          <div className="hist-view">
            <BoardView
              players={snap.players}
              caption={`${open?.room_code ?? ""} · ${new Date(open!.played_at).toLocaleString(localeOf(lang))}`}
            />
            <div className="hist-stories">
              {snap.players.map((p) => (
                <div key={p.id} className="hist-story">
                  <div className="hist-title">
                    {p.avatar} {p.name}
                  </div>
                  <div className={`hist-line${p.revealed_truth === "A" ? " true" : ""}`}>
                    <i>A</i> {p.story_a}
                  </div>
                  <div className={`hist-line${p.revealed_truth === "B" ? " true" : ""}`}>
                    <i>B</i> {p.story_b}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
