import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Backdrop } from "@/components/tof/Backdrop";
import { useCountdown, useRoom } from "@/hooks/useRoom";
import { AVATARS, playerKey, type Player, type Vote } from "@/lib/tof";

export const Route = createFileRoute("/play/$code")({
  head: () => ({
    meta: [
      { title: "加入游戏 · TRUE or FALSE 真真假假" },
      { name: "description", content: "写下一真一假两个故事，然后猜猜别人的哪个是真的。" },
      { property: "og:title", content: "加入 TRUE or FALSE 真真假假" },
      { property: "og:description", content: "写下一真一假两个故事，然后猜猜别人的哪个是真的。" },
    ],
  }),
  component: PlayPage,
});

function Counter({ n }: { n: number }) {
  const cls = n >= 40 ? "cnt full" : n >= 30 ? "cnt warn" : "cnt";
  return <span className={cls}>{n}/40</span>;
}

function PlayPage() {
  const { code } = Route.useParams();
  const upper = code.toUpperCase();
  const { room, players, votes, loading, missing, setVotes } = useRoom(upper);

  const [myId, setMyId] = useState<string | null>(null);
  const [step, setStep] = useState<"nick" | "form">("nick");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]!);
  const [storyA, setStoryA] = useState("");
  const [storyB, setStoryB] = useState("");
  const [truth, setTruth] = useState<"A" | "B" | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // 本地乐观选择：点了就立刻高亮，不等实时推送回来
  const [localChoice, setLocalChoice] = useState<{ target: string; choice: "A" | "B" } | null>(null);
  const [voteErr, setVoteErr] = useState("");

  useEffect(() => {
    setMyId(localStorage.getItem(playerKey(upper)));
  }, [upper]);

  const me = useMemo(() => players.find((p) => p.id === myId) ?? null, [players, myId]);
  const current = useMemo(
    () => players.find((p) => p.id === room?.current_player_id) ?? null,
    [players, room?.current_player_id],
  );
  const myVote = useMemo(
    () => votes.find((v) => v.target_id === current?.id && v.voter_id === myId) ?? null,
    [votes, current?.id, myId],
  );
  const shownChoice =
    localChoice && localChoice.target === current?.id ? localChoice.choice : myVote?.choice;
  const left = useCountdown(room?.voting_ends_at);

  const submit = async () => {
    if (!room || !truth || !storyA.trim() || !storyB.trim()) return;
    setBusy(true);
    setErr("");
    const { data, error } = await supabase
      .from("players")
      .insert({
        room_id: room.id,
        name: name.trim(),
        avatar,
        story_a: storyA.trim(),
        story_b: storyB.trim(),
        submitted: true,
      })
      .select()
      .single();
    if (error || !data) {
      setBusy(false);
      setErr("提交失败，再试一次");
      return;
    }
    const player = data as Player;
    await supabase.from("player_secrets").insert({ player_id: player.id, truth });
    localStorage.setItem(playerKey(upper), player.id);
    setMyId(player.id);
    setBusy(false);
  };

  const castVote = async (choice: "A" | "B") => {
    if (!room || !current || !myId) return;
    const targetId = current.id;
    setLocalChoice({ target: targetId, choice });
    setVoteErr("");
    const { data, error } = await supabase
      .from("votes")
      .upsert(
        { room_id: room.id, target_id: targetId, voter_id: myId, choice },
        { onConflict: "target_id,voter_id" },
      )
      .select()
      .single();
    if (error || !data) {
      setLocalChoice(null);
      setVoteErr("没投上，再点一次");
      return;
    }
    // 不依赖实时推送，直接把自己的票写进本地状态
    const row = data as Vote;
    setVotes((prev) => {
      const i = prev.findIndex((v) => v.id === row.id);
      if (i === -1) return [...prev, row];
      const next = prev.slice();
      next[i] = row;
      return next;
    });
  };

  if (loading) {
    return (
      <>
        <Backdrop />
        <main className="phone-root">
          <div className="pstep">
            <p className="pdesc">正在连接房间…</p>
          </div>
        </main>
      </>
    );
  }

  if (missing || !room) {
    return (
      <>
        <Backdrop />
        <main className="phone-root">
          <div className="pstep">
            <div className="ptitle">房间不存在</div>
            <p className="pdesc">房间码 {upper} 没找到，看看大屏上的码再试一次。</p>
          </div>
        </main>
      </>
    );
  }

  const submittedCount = players.filter((p) => p.submitted).length;

  // ============ 还没提交：昵称 → 写故事 ============
  if (!me) {
    return (
      <>
        <Backdrop />
        <main className="phone-root">
          {step === "nick" ? (
            <div className="pstep">
              <div className="ptitle">
                加入 <span style={{ color: "var(--brand-2)" }}>{upper}</span>
              </div>
              <p className="pdesc">给自己起个名字，等下大屏上大家都看得到。</p>
              <div className="field">
                <label htmlFor="nick">昵称</label>
                <input
                  id="nick"
                  value={name}
                  maxLength={12}
                  placeholder="比如：小明 / Mia"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="field">
                <label>选个头像</label>
                <div className="avapick">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      className={a === avatar ? "sel" : ""}
                      onClick={() => setAvatar(a)}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <button className="btn" disabled={!name.trim()} onClick={() => setStep("form")}>
                进入 →
              </button>
            </div>
          ) : (
            <div className="pstep">
              <div className="ptitle">写两个故事</div>
              <p className="pdesc">
                一个真的，一个编的。<b style={{ color: "var(--ink)" }}>最多 40 字</b> ——
                写钩子就好，细节留着上台口头讲。
              </p>
              <div className="field">
                <label htmlFor="sa">
                  故事 A <Counter n={storyA.length} />
                </label>
                <textarea
                  id="sa"
                  rows={3}
                  maxLength={40}
                  value={storyA}
                  placeholder="我曾经在冰岛开车爆胎，被一群羊围观了两小时"
                  onChange={(e) => setStoryA(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="sb">
                  故事 B <Counter n={storyB.length} />
                </label>
                <textarea
                  id="sb"
                  rows={3}
                  maxLength={40}
                  value={storyB}
                  placeholder="我给自己家的猫注册过一个营业执照"
                  onChange={(e) => setStoryB(e.target.value)}
                />
              </div>
              <div className="field">
                <label>哪个是真的？（只有你自己知道）</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className={`btn ghost${truth === "A" ? " sel" : ""}`}
                    onClick={() => setTruth("A")}
                  >
                    A 是真的
                  </button>
                  <button
                    className={`btn ghost${truth === "B" ? " sel" : ""}`}
                    onClick={() => setTruth("B")}
                  >
                    B 是真的
                  </button>
                </div>
              </div>
              {err && <p className="pdesc" style={{ color: "var(--fake)" }}>{err}</p>}
              <button
                className="btn"
                disabled={busy || !truth || !storyA.trim() || !storyB.trim()}
                onClick={() => void submit()}
              >
                提交 ✓
              </button>
            </div>
          )}
        </main>
      </>
    );
  }

  // ============ 已提交：跟着 room.phase 走 ============
  const phase = room.phase;
  const isMyTurn = current?.id === me.id;

  let body: React.ReactNode = null;

  if (phase === "lobby") {
    body = (
      <div className="pstep">
        <div className="ptitle">已提交</div>
        <p className="pdesc">你的便利贴已经飞上大屏了。等大家都填完，主持人会开始。</p>
        <div className="wait-ill">
          <div className="tick">✓</div>
        </div>
        <p className="pdesc" style={{ textAlign: "center" }}>
          已提交 <b style={{ color: "var(--brand-2)" }}>{submittedCount}</b> 人 · 等下一位
        </p>
      </div>
    );
  } else if (phase === "stage") {
    body = (
      <div className="pstep">
        <div className="result-hero">
          <div className="big">{isMyTurn ? "🎤" : current?.avatar ?? "👂"}</div>
          <h3>{isMyTurn ? "该你上台了" : `${current?.name ?? "有人"} 正在讲`}</h3>
          <p>{isMyTurn ? "把两个故事都讲一遍，别露馅" : "认真听 —— 等下要投票"}</p>
        </div>
      </div>
    );
  } else if (phase === "voting") {
    body = isMyTurn ? (
      <div className="pstep">
        <div className="result-hero">
          <div className="big">🤫</div>
          <h3>大家正在投票</h3>
          <p>还剩 {left} 秒 · 保持面无表情</p>
        </div>
      </div>
    ) : (
      <div className="pstep">
        <div className="ptitle">
          你觉得哪个是<span style={{ color: "var(--true)" }}>真</span>的？
        </div>
        <p className="pdesc">{current?.name} 的故事</p>
        <div className="vote-opts">
          {(["A", "B"] as const).map((k) => (
            <button
              key={k}
              className={`opt${myVote?.choice === k ? " sel" : ""}`}
              type="button"
              onClick={() => void castVote(k)}
            >
              <span className="k">{k}</span>
              <div className="s">{k === "A" ? current?.story_a : current?.story_b}</div>
            </button>
          ))}
        </div>
        <div className="countdown">
          {myVote ? "已锁定，可以改，但只剩 " : "还剩 "}
          <b>{left}</b> 秒
        </div>
      </div>
    );
  } else if (phase === "reveal") {
    const t = current?.revealed_truth;
    const targetVotes = votes.filter((v) => v.target_id === current?.id);
    const total = targetVotes.length;
    const fooled = total ? Math.round(((total - targetVotes.filter((v) => v.choice === t).length) / total) * 100) : 0;
    if (isMyTurn) {
      body = (
        <div className="pstep">
          <div className="result-hero">
            <div className="big">{fooled > 50 ? "😈" : "🕵️"}</div>
            <h3>{fooled > 50 ? "骗术大师！" : "被识破了"}</h3>
            <p>你骗过了 {fooled}% 的人（{total} 人投票）</p>
            <div className="chip">当前 {me.score ?? 0} 分</div>
          </div>
        </div>
      );
    } else if (!myVote) {
      body = (
        <div className="pstep">
          <div className="result-hero">
            <div className="big">😶</div>
            <h3>这轮你没投票</h3>
            <p>真的是 {t ?? "?"} · 下轮记得手快点</p>
          </div>
        </div>
      );
    } else {
      const right = myVote.choice === t;
      body = (
        <div className="pstep">
          <div className="result-hero">
            <div className="big">{right ? "🎉" : "😵"}</div>
            <h3>{right ? "猜对了！" : "被骗了"}</h3>
            <p>
              {t} 才是真的 · 有 {fooled}% 的人被骗
            </p>
            <div className="chip">
              {right ? "＋1 分 · " : ""}当前 {me.score ?? 0} 分
            </div>
          </div>
        </div>
      );
    }
  } else {
    const ranked = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const rank = ranked.findIndex((p) => p.id === me.id) + 1;
    body = (
      <div className="pstep">
        <div className="result-hero">
          <div className="big">{rank === 1 ? "🏆" : "🎊"}</div>
          <h3>第 {rank} 名</h3>
          <p>共 {me.score ?? 0} 分 · 猜对 {me.correct_count ?? 0} 次 · 骗到 {me.fooled_pct ?? 0}%</p>
          <div className="chip">抬头看大屏，念奖了</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Backdrop />
      <main className="phone-root">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="ava">{me.avatar}</div>
          <div style={{ fontWeight: 800 }}>{me.name}</div>
          <div style={{ flex: 1 }} />
          <div className="chip">{me.score ?? 0} 分</div>
        </div>
        {body}
      </main>
    </>
  );
}