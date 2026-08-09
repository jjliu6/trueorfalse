import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Backdrop } from "@/components/tof/Backdrop";
import { fetchRoomByCode, makeCode, makeHostKey } from "@/lib/tof";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TRUE or FALSE · 真真假假 | 破冰游戏" },
      {
        name: "description",
        content:
          "线下 Hackathon 破冰游戏：每人写一真一假两个故事，其他人猜哪个是真的。输入房间码即可加入。",
      },
      { property: "og:title", content: "TRUE or FALSE · 真真假假" },
      {
        property: "og:description",
        content: "一真一假两个故事，猜猜哪个是真的 —— 25 分钟破冰游戏。",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const join = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    setErr("");
    const room = await fetchRoomByCode(c);
    setBusy(false);
    if (!room) {
      setErr("找不到这个房间码，再看看大屏？");
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
      const { data, error } = await supabase
        .from("rooms")
        .insert({ code: newCode, host_key: hostKey })
        .select()
        .single();
      if (data && !error) {
        setBusy(false);
        void navigate({ to: "/screen/$code", params: { code: newCode }, search: { k: hostKey } });
        return;
      }
      // 23505 = unique_violation，只有撞码才值得重试
      if (error?.code !== "23505") break;
    }
    setBusy(false);
    setErr("房间创建失败，再试一次");
  };

  return (
    <>
      <Backdrop />
      <main className="phone-root">
        <div className="pstep">
          <div>
            <h1 className="wordmark" style={{ fontSize: 40 }}>
              <span className="t">TRUE</span>
              <span className="or">or</span>
              <span className="f">FALSE</span>
            </h1>
            <div className="sub-cn" style={{ fontSize: 13 }}>
              真 真 假 假
            </div>
          </div>
          <p className="pdesc">
            每人写一个真故事、一个编的，其他人猜哪个是真的。
            <br />
            输入大屏上的房间码就能加入。
          </p>
          <div className="field">
            <label htmlFor="code">房间码</label>
            <input
              id="code"
              value={code}
              autoCapitalize="characters"
              placeholder="例如 TFABCD"
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
            加入房间 →
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" disabled={busy} onClick={() => void createRoom()}>
            🖥 我是主持人 · 开一个新房间
          </button>
          <a className="minibtn" href="/history" style={{ justifyContent: "center" }}>
            📚 主持人登录 · 保存 / 导出 / 回看记录
          </a>
        </div>
      </main>
    </>
  );
}
