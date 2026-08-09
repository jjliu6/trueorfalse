import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Backdrop } from "@/components/tof/Backdrop";
import { BoardView } from "@/components/tof/BoardView";
import { isSnapshot, type GameSnapshot } from "@/lib/records";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "历史记录 · TRUE or FALSE 真真假假" },
      { name: "description", content: "回看保存过的每一场真真假假对局榜单与故事。" },
      { property: "og:title", content: "历史记录 · TRUE or FALSE" },
      { property: "og:description", content: "回看保存过的每一场对局榜单与故事。" },
    ],
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
              <span className="t">历史</span>
              <span className="or">·</span>
              <span className="f">记录</span>
            </h1>
            <div className="sub-cn" style={{ fontSize: 11 }}>
              保存过的对局都在这里
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link to="/" className="minibtn">
              首页
            </Link>
            <button className="minibtn" onClick={() => void signOut()}>
              退出登录
            </button>
          </div>
        </header>

        {rows === null && <p className="pdesc">加载中…</p>}
        {rows?.length === 0 && (
          <p className="pdesc">还没有记录。在大屏榜单页点「保存记录」，这一场就会出现在这里。</p>
        )}

        <div className="hist-list">
          {rows?.map((r) => (
            <div key={r.id} className="hist-item">
              <div>
                <div className="hist-title">{r.title || `房间 ${r.room_code}`}</div>
                <div className="hist-meta">
                  {new Date(r.played_at).toLocaleString("zh-CN")} · {r.room_code} ·{" "}
                  {isSnapshot(r.snapshot) ? r.snapshot.players.length : 0} 人
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="minibtn" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                  {openId === r.id ? "收起" : "回看"}
                </button>
                <button className="minibtn danger" onClick={() => void remove(r.id)}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>

        {snap && (
          <div className="hist-view">
            <BoardView
              players={snap.players}
              caption={`${open?.room_code ?? ""} · ${new Date(open!.played_at).toLocaleString("zh-CN")}`}
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