import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Backdrop } from "@/components/tof/Backdrop";
import { useCountdown, useRoom, useServerClockOffset } from "@/hooks/useRoom";
import { AVATARS, playerKey, type Player, type Vote } from "@/lib/tof";
import { useLang } from "@/lib/i18n";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/play/$code")({
  head: () =>
    seo({
      title: "加入游戏 · TRUE or FALSE 真真假假",
      description: "写下一真一假两个故事，然后猜猜别人的哪个是真的。",
      path: "/play",
      // 房间是临时对局页，不应被搜索引擎索引
      noindex: true,
    }),
  component: PlayPage,
});

function Counter({ n }: { n: number }) {
  const cls = n >= 40 ? "cnt full" : n >= 30 ? "cnt warn" : "cnt";
  return <span className={cls}>{n}/40</span>;
}

function PlayPage() {
  const { code } = Route.useParams();
  const { t } = useLang();
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
  const [localChoice, setLocalChoice] = useState<{ target: string; choice: "A" | "B" } | null>(
    null,
  );
  const [voteErr, setVoteErr] = useState("");

  useEffect(() => {
    setMyId(localStorage.getItem(playerKey(upper)));
  }, [upper]);

  // 换人时清掉上一轮的本地选择
  useEffect(() => {
    setLocalChoice(null);
    setVoteErr("");
  }, [room?.current_player_id]);

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
  const clockOffsetMs = useServerClockOffset();
  const left = useCountdown(room?.voting_ends_at, clockOffsetMs);

  const submit = async () => {
    if (!room || !truth || !storyA.trim() || !storyB.trim()) return;
    setBusy(true);
    setErr("");
    // 建玩家、写 truth 在数据库那一侧一次性原子完成——
    // 不这样的话，两次 insert 中间的网络往返就是个竞态窗口，
    // 别人能抢在真正的提交者之前给这个玩家插一条编的 truth
    const { data, error } = await supabase.rpc("submit_player", {
      p_room_id: room.id,
      p_name: name.trim(),
      p_avatar: avatar,
      p_story_a: storyA.trim(),
      p_story_b: storyB.trim(),
      p_truth: truth,
    });
    if (error || !data) {
      setBusy(false);
      setErr(t("play.err.submit"));
      return;
    }
    const player = data as Player;
    localStorage.setItem(playerKey(upper), player.id);
    setMyId(player.id);
    setBusy(false);
  };

  const castVote = async (choice: "A" | "B") => {
    if (!room || !current || !myId) return;
    // 倒计时归零后大屏随时可能揭晓，这时再放票进来就成了"看完答案再投"
    if (room.phase !== "voting" || left <= 0) return;
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
      setVoteErr(t("play.err.vote"));
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
            <p className="pdesc">{t("play.connecting")}</p>
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
            <div className="ptitle">{t("play.missing.title")}</div>
            <p className="pdesc">{t("play.missing.desc", { code: upper })}</p>
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
                {t("play.join.title", { code: "" })}
                <span style={{ color: "var(--brand-2)" }}>{upper}</span>
              </div>
              <p className="pdesc">{t("play.join.desc")}</p>
              <div className="field">
                <label htmlFor="nick">{t("play.nick.label")}</label>
                <input
                  id="nick"
                  value={name}
                  maxLength={12}
                  placeholder={t("play.nick.placeholder")}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="field">
                <label>{t("play.avatar.label")}</label>
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
                {t("play.enter")}
              </button>
            </div>
          ) : (
            <div className="pstep">
              <div className="ptitle">{t("play.story.title")}</div>
              <p className="pdesc">
                {t("play.story.desc.1")}{" "}
                <b style={{ color: "var(--ink)" }}>{t("play.story.desc.2")}</b>{" "}
                {t("play.story.desc.3")}
              </p>
              <div className="field">
                <label htmlFor="sa">
                  {t("play.storyA.label")} <Counter n={storyA.length} />
                </label>
                <textarea
                  id="sa"
                  rows={3}
                  maxLength={40}
                  value={storyA}
                  placeholder={t("play.storyA.placeholder")}
                  onChange={(e) => setStoryA(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="sb">
                  {t("play.storyB.label")} <Counter n={storyB.length} />
                </label>
                <textarea
                  id="sb"
                  rows={3}
                  maxLength={40}
                  value={storyB}
                  placeholder={t("play.storyB.placeholder")}
                  onChange={(e) => setStoryB(e.target.value)}
                />
              </div>
              <div className="field">
                <label>{t("play.truth.label")}</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className={`btn ghost${truth === "A" ? " sel" : ""}`}
                    onClick={() => setTruth("A")}
                  >
                    {t("play.truth.A")}
                  </button>
                  <button
                    className={`btn ghost${truth === "B" ? " sel" : ""}`}
                    onClick={() => setTruth("B")}
                  >
                    {t("play.truth.B")}
                  </button>
                </div>
              </div>
              {err && (
                <p className="pdesc" style={{ color: "var(--fake)" }}>
                  {err}
                </p>
              )}
              <button
                className="btn"
                disabled={busy || !truth || !storyA.trim() || !storyB.trim()}
                onClick={() => void submit()}
              >
                {t("play.submit")}
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
        <div className="ptitle">{t("play.lobby.title")}</div>
        <p className="pdesc">{t("play.lobby.desc")}</p>
        <div className="wait-ill">
          <div className="tick">✓</div>
        </div>
        <p className="pdesc" style={{ textAlign: "center" }}>
          {t("play.lobby.count", { n: submittedCount })}
        </p>
      </div>
    );
  } else if (phase === "stage") {
    body = (
      <div className="pstep">
        <div className="result-hero">
          <div className="big">{isMyTurn ? "🎤" : (current?.avatar ?? "👂")}</div>
          <h3>
            {isMyTurn
              ? t("play.stage.me.h")
              : t("play.stage.other.h", { name: current?.name ?? t("play.stage.someone") })}
          </h3>
          <p>{isMyTurn ? t("play.stage.me.p") : t("play.stage.other.p")}</p>
        </div>
      </div>
    );
  } else if (phase === "voting") {
    body = isMyTurn ? (
      <div className="pstep">
        <div className="result-hero">
          <div className="big">🤫</div>
          <h3>{t("play.voting.me.h")}</h3>
          <p>{t("play.voting.me.p", { n: left })}</p>
        </div>
      </div>
    ) : (
      <div className="pstep">
        <div className="ptitle">{t("play.voting.title")}</div>
        <p className="pdesc">{t("play.voting.storyOf", { name: current?.name ?? "" })}</p>
        <div className="vote-opts">
          {(["A", "B"] as const).map((k) => (
            <button
              key={k}
              className={`opt${shownChoice === k ? " sel" : ""}`}
              type="button"
              disabled={left <= 0}
              onClick={() => void castVote(k)}
            >
              <span className="k">{k}</span>
              <div className="s">{k === "A" ? current?.story_a : current?.story_b}</div>
            </button>
          ))}
        </div>
        {voteErr && (
          <p className="pdesc" style={{ color: "var(--fake)", textAlign: "center" }}>
            {voteErr}
          </p>
        )}
        <div className="countdown">
          {left <= 0 ? (
            t("play.countdown.timeup")
          ) : (
            <>
              {shownChoice ? t("play.countdown.locked") : t("play.countdown.left")}
              <b>{left}</b>
              {t("play.countdown.sec")}
            </>
          )}
        </div>
      </div>
    );
  } else if (phase === "reveal") {
    const t2 = current?.revealed_truth;
    const targetVotes = votes.filter((v) => v.target_id === current?.id);
    const total = targetVotes.length;
    const fooled = total
      ? Math.round(((total - targetVotes.filter((v) => v.choice === t2).length) / total) * 100)
      : 0;
    if (isMyTurn) {
      body = (
        <div className="pstep">
          <div className="result-hero">
            <div className="big">{fooled > 50 ? "😈" : "🕵️"}</div>
            <h3>{fooled > 50 ? t("play.reveal.master.h") : t("play.reveal.busted.h")}</h3>
            <p>{t("play.reveal.fooled", { pct: fooled, n: total })}</p>
            <div className="chip">{t("play.reveal.score", { n: me.score ?? 0 })}</div>
          </div>
        </div>
      );
    } else if (!myVote) {
      body = (
        <div className="pstep">
          <div className="result-hero">
            <div className="big">😶</div>
            <h3>{t("play.reveal.novote.h")}</h3>
            <p>{t("play.reveal.novote.p", { t: t2 ?? "?" })}</p>
          </div>
        </div>
      );
    } else {
      const right = myVote.choice === t2;
      body = (
        <div className="pstep">
          <div className="result-hero">
            <div className="big">{right ? "🎉" : "😵"}</div>
            <h3>{right ? t("play.reveal.right.h") : t("play.reveal.wrong.h")}</h3>
            <p>{t("play.reveal.truth", { t: t2 ?? "?", pct: fooled })}</p>
            <div className="chip">
              {right ? t("play.reveal.plus1") : ""}
              {t("play.reveal.score", { n: me.score ?? 0 })}
            </div>
          </div>
        </div>
      );
    }
  } else {
    // 大屏榜单只排已提交的人，这里要跟它一致，否则两边名次对不上
    const ranked = players
      .filter((p) => p.submitted)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const rank = ranked.findIndex((p) => p.id === me.id) + 1;
    body = (
      <div className="pstep">
        <div className="result-hero">
          <div className="big">{rank === 1 ? "🏆" : "🎊"}</div>
          <h3>{t("play.board.rank", { n: rank })}</h3>
          <p>
            {t("play.board.summary", {
              score: me.score ?? 0,
              correct: me.correct_count ?? 0,
              fooled: me.fooled_pct ?? 0,
            })}
          </p>
          <div className="chip">{t("play.board.cta")}</div>
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
          <div className="chip">{t("play.score", { n: me.score ?? 0 })}</div>
        </div>
        {body}
      </main>
    </>
  );
}
