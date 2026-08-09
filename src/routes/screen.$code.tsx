import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Backdrop } from "@/components/tof/Backdrop";
import { ConfettiCanvas, useConfetti } from "@/components/tof/Confetti";
import { QR } from "@/components/tof/QR";
import { useCountdown, useRoom } from "@/hooks/useRoom";
import { useSound } from "@/hooks/useSound";
import { noteStyle, wallCols, type Player } from "@/lib/tof";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/screen/$code")({
  validateSearch: (search: Record<string, unknown>) => ({
    k: typeof search["k"] === "string" ? (search["k"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "大屏 · TRUE or FALSE 真真假假" },
      { name: "description", content: "投影大屏：故事墙、点名、投票倒计时与最终榜单。" },
      { property: "og:title", content: "大屏 · TRUE or FALSE 真真假假" },
      { property: "og:description", content: "投影大屏：故事墙、点名、投票倒计时与最终榜单。" },
    ],
  }),
  component: ScreenPage,
});

/** 投票时长，改这里同时改倒计时圈的进度基准 */
const VOTE_SECONDS = 20;

const PHASE_LABEL_KEY: Record<string, string> = {
  lobby: "screen.phase.lobby",
  stage: "screen.phase.stage",
  voting: "screen.phase.voting",
  reveal: "screen.phase.reveal",
  board: "screen.phase.board",
};

function ScreenPage() {
  const { code } = Route.useParams();
  const { k } = Route.useSearch();
  const { t } = useLang();
  const upper = code.toUpperCase();
  const { room, players, votes, loading, missing } = useRoom(upper);
  const snd = useSound();
  const { fire, ref: confettiRef } = useConfetti();

  const isHost = !!room && !!k && k === room.host_key;

  // 大屏锁滚动
  useEffect(() => {
    document.body.classList.add("tof-lock");
    return () => document.body.classList.remove("tof-lock");
  }, []);

  const submitted = useMemo(() => players.filter((p) => p.submitted), [players]);
  const remaining = useMemo(() => submitted.filter((p) => !p.turn_done), [submitted]);
  const current = useMemo(
    () => players.find((p) => p.id === room?.current_player_id) ?? null,
    [players, room?.current_player_id],
  );
  const left = useCountdown(room?.voting_ends_at);
  const phase = room?.phase ?? "lobby";

  const joinUrl = typeof window === "undefined" ? "" : `${window.location.origin}/play/${upper}`;

  /* ---------------- 音效触发 ---------------- */
  const prevSubmitted = useRef(0);
  useEffect(() => {
    if (submitted.length > prevSubmitted.current && prevSubmitted.current > 0) snd.join();
    prevSubmitted.current = submitted.length;
  }, [submitted.length, snd]);

  const lastTick = useRef(-1);
  useEffect(() => {
    if (phase !== "voting") {
      lastTick.current = -1;
      return;
    }
    if (left === lastTick.current) return;
    lastTick.current = left;
    if (left <= 3) snd.tick(true);
    else if (left <= 10) snd.tick(false);
  }, [left, phase, snd]);

  const prevPhase = useRef(phase);
  useEffect(() => {
    if (prevPhase.current === phase) return;
    prevPhase.current = phase;
    if (phase === "reveal") {
      snd.boom();
      window.setTimeout(() => snd.chime(), 260);
      fire(150);
    }
    if (phase === "board") {
      snd.fanfare();
      fire(150);
      window.setTimeout(() => fire(120), 700);
    }
  }, [phase, snd, fire]);

  /* ---------------- 跑马灯点名 ---------------- */
  const [spinning, setSpinning] = useState(false);
  const [spotId, setSpotId] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const goStage = useCallback(
    async (playerId: string) => {
      if (!room) return;
      await supabase
        .from("rooms")
        .update({ current_player_id: playerId, phase: "stage", voting_ends_at: null })
        .eq("id", room.id);
    },
    [room],
  );

  const spinPick = useCallback(() => {
    if (!room || spinning || remaining.length === 0) return;
    const target = remaining[Math.floor(Math.random() * remaining.length)]!;
    timers.current = []; // 上一轮的 timeout 都已经跑完了，别让这个数组一场游戏下来一直涨
    setSpinning(true);
    setPickedId(null);
    let delay = 55;
    let i = Math.floor(Math.random() * remaining.length);
    const hop = () => {
      i = (i + 1) % remaining.length;
      setSpotId(remaining[i]!.id);
      snd.roll();
      delay *= 1.14;
      if (delay > 300) {
        setSpotId(target.id);
        setPickedId(target.id);
        snd.ding();
        timers.current.push(
          window.setTimeout(() => {
            setSpinning(false);
            setSpotId(null);
            setPickedId(null);
            void goStage(target.id);
          }, 900),
        );
        return;
      }
      timers.current.push(window.setTimeout(hop, delay));
    };
    hop();
  }, [room, spinning, remaining, snd, goStage]);

  /* ---------------- 主持人操作 ---------------- */
  const setPhase = useCallback(
    async (patch: {
      phase?: string;
      current_player_id?: string | null;
      voting_ends_at?: string | null;
    }) => {
      if (!room) return;
      await supabase.from("rooms").update(patch).eq("id", room.id);
    },
    [room],
  );

  const next = useCallback(async () => {
    if (!room || spinning) return;
    if (phase === "lobby") {
      if (remaining.length > 0) spinPick();
      else await setPhase({ phase: "board", current_player_id: null });
    } else if (phase === "stage") {
      await setPhase({
        phase: "voting",
        voting_ends_at: new Date(Date.now() + VOTE_SECONDS * 1000).toISOString(),
      });
    } else if (phase === "voting") {
      if (room.current_player_id) {
        await supabase.rpc("reveal_truth", { p_player: room.current_player_id });
        await supabase.rpc("settle_round", { p_player: room.current_player_id });
      }
      await setPhase({ phase: "reveal" });
    } else if (phase === "reveal") {
      const left2 = submitted.filter((p) => !p.turn_done && p.id !== room.current_player_id);
      if (left2.length > 0)
        await setPhase({ phase: "lobby", current_player_id: null, voting_ends_at: null });
      else await setPhase({ phase: "board", current_player_id: null });
    }
  }, [room, phase, remaining.length, spinning, spinPick, setPhase, submitted]);

  const back = useCallback(async () => {
    if (!room) return;
    if (phase === "stage") await setPhase({ phase: "lobby", current_player_id: null });
    else if (phase === "voting") await setPhase({ phase: "stage", voting_ends_at: null });
    // 回到投票要顺手续上倒计时，否则 voting_ends_at 还停在过去，所有人的投票按钮都是灰的
    else if (phase === "reveal")
      await setPhase({
        phase: "voting",
        voting_ends_at: new Date(Date.now() + VOTE_SECONDS * 1000).toISOString(),
      });
    else if (phase === "board") await setPhase({ phase: "lobby" });
  }, [room, phase, setPhase]);

  const reset = useCallback(async () => {
    if (!room) return;
    if (!window.confirm(t("screen.reset.confirm"))) return;
    await supabase.from("votes").delete().eq("room_id", room.id);
    await supabase
      .from("players")
      .update({ score: 0, turn_done: false, correct_count: 0, fooled_pct: 0, revealed_truth: null })
      .eq("room_id", room.id);
    await setPhase({ phase: "lobby", current_player_id: null, voting_ends_at: null });
  }, [room, setPhase, t]);

  /* ---------------- 控制条显示/快捷键 ---------------- */
  const [hudOn, setHudOn] = useState(false);
  const hudTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!isHost) return;
    const wake = () => {
      setHudOn(true);
      if (hudTimer.current) window.clearTimeout(hudTimer.current);
      hudTimer.current = window.setTimeout(() => setHudOn(false), 3500);
    };
    window.addEventListener("mousemove", wake);
    return () => {
      window.removeEventListener("mousemove", wake);
      if (hudTimer.current) window.clearTimeout(hudTimer.current);
    };
  }, [isHost]);

  useEffect(() => {
    if (!isHost) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && ["INPUT", "TEXTAREA"].includes(el.tagName)) return;
      if (e.code === "Space" || e.code === "ArrowRight") {
        e.preventDefault();
        void next();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        void back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isHost, next, back]);

  if (loading || missing || !room) {
    return (
      <>
        <Backdrop />
        <div className="screen-root">
          <div className="scene" style={{ alignItems: "center", justifyContent: "center" }}>
            <div className="ptitle">
              {missing ? t("screen.missing", { code: upper }) : t("screen.connecting")}
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ---------------- 主按钮文案 ---------------- */
  let mainLabel = t("screen.main.random");
  let statusLine = t("screen.status.remain", { n: remaining.length });
  let disabled = false;
  if (phase === "lobby") {
    if (remaining.length === 0) {
      mainLabel = t("screen.main.board");
      statusLine = submitted.length ? t("screen.status.alldone") : t("screen.status.waiting");
      disabled = submitted.length === 0;
    }
  } else if (phase === "stage") {
    mainLabel = t("screen.main.vote", { n: VOTE_SECONDS });
    statusLine = t("screen.status.speaking", { name: current?.name ?? "" });
  } else if (phase === "voting") {
    mainLabel = t("screen.main.reveal");
    statusLine = t("screen.status.left", { n: left });
  } else if (phase === "reveal") {
    const rest = submitted.filter((p) => !p.turn_done && p.id !== room.current_player_id);
    mainLabel = rest.length > 0 ? t("screen.main.back") : t("screen.main.board");
    statusLine =
      rest.length > 0
        ? t("screen.status.remainNoTalk", { n: rest.length })
        : t("screen.status.alldone2");
  } else {
    mainLabel = t("screen.main.over");
    statusLine = t("screen.status.award");
    disabled = true;
  }

  return (
    <>
      <Backdrop />
      <ConfettiCanvas canvasRef={confettiRef} />
      <div className="screen-root">
        {phase === "lobby" && (
          <LobbyScene
            code={upper}
            joinUrl={joinUrl}
            players={submitted}
            pickable={isHost && !spinning}
            spinning={spinning}
            spotId={spotId}
            pickedId={pickedId}
            onPick={(id) => void goStage(id)}
          />
        )}
        {(phase === "stage" || phase === "voting" || phase === "reveal") && current && (
          <SpotScene
            phase={phase}
            player={current}
            players={submitted}
            votes={votes.filter((v) => v.target_id === current.id)}
            left={left}
          />
        )}
        {phase === "board" && <BoardScene players={submitted} />}

        {isHost && (
          <>
            <div className={`hud${hudOn ? " show" : ""}`}>
              <button
                className="hudbtn"
                disabled={disabled || spinning}
                onClick={() => void next()}
              >
                {mainLabel}
              </button>
              <div className="hud-now">
                <span>{t(PHASE_LABEL_KEY[phase]!)}</span>
                <b>{statusLine}</b>
              </div>
              <div className="hud-sec">
                <button onClick={() => void back()}>{t("screen.hud.back")}</button>
                <button onClick={() => void setPhase({ phase: "board", current_player_id: null })}>
                  {t("screen.hud.board")}
                </button>
                <button onClick={() => snd.setMuted((m) => !m)}>
                  {snd.muted ? t("screen.hud.muted") : t("screen.hud.sound")}
                </button>
                <button onClick={() => void reset()}>{t("screen.hud.reset")}</button>
              </div>
            </div>
            <div className={`keyhint${hudOn ? " hide" : ""}`}>{t("screen.keyhint")}</div>
          </>
        )}
      </div>
    </>
  );
}

/* ================= 故事墙 ================= */
function LobbyScene({
  code,
  joinUrl,
  players,
  pickable,
  spinning,
  spotId,
  pickedId,
  onPick,
}: {
  code: string;
  joinUrl: string;
  players: Player[];
  pickable: boolean;
  spinning: boolean;
  spotId: string | null;
  pickedId: string | null;
  onPick: (id: string) => void;
}) {
  const { t } = useLang();
  const empty = players.length === 0;
  const host = joinUrl.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  return (
    <div className="scene">
      <div className="lobby">
        <div className="lobby-top">
          <div className="wordmark">
            <span className="t">TRUE</span>
            <span className="or">or</span>
            <span className="f">FALSE</span>
          </div>
          <div className="counter">{t("lobby.submitted", { n: players.length })}</div>
          <div className="spacer" />
          {!empty && (
            <div className="joinchip">
              <QR value={joinUrl} size={86} />
              <div>
                <div className="code-label">{t("lobby.scan")}</div>
                <div className="room-code">{code}</div>
                <div className="url-hint">{host}</div>
              </div>
            </div>
          )}
        </div>

        {empty ? (
          <div className="empty-cta">
            <div className="sub-cn">{t("home.title.sub")}</div>
            <QR value={joinUrl} size={250} />
            <div style={{ textAlign: "center" }}>
              <div className="code-label" style={{ marginBottom: 6 }}>
                {t("lobby.scanOrCode")}
              </div>
              <div className="room-code">{code}</div>
              <div className="url-hint" style={{ marginTop: 8 }}>
                {host}
              </div>
            </div>
            <div className="tips" style={{ whiteSpace: "pre-line" }}>
              {t("lobby.tips")}
            </div>
          </div>
        ) : (
          <div
            className={`wall${pickable ? " pickable" : ""}${spinning ? " spinning" : ""}`}
            style={{ "--cols": wallCols(players.length) } as React.CSSProperties}
          >
            {players.map((p, i) => (
              <div
                key={p.id}
                className={[
                  "note",
                  p.turn_done ? "done" : "",
                  spotId === p.id ? "spot" : "",
                  pickedId === p.id ? "picked" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-h={i % 5}
                style={noteStyle(p.id, i)}
                onClick={() => pickable && !p.turn_done && onPick(p.id)}
              >
                <div className="tape" />
                <div className="pickflag">{t("lobby.pickflag")}</div>
                <div className="donemark">✓</div>
                <div className="nhead">
                  <div className="ava">{p.avatar}</div>
                  <div className="pname">{p.name}</div>
                </div>
                <div className="nstory">
                  <i>A</i>
                  <p>{p.story_a}</p>
                </div>
                <div className="nstory">
                  <i>B</i>
                  <p>{p.story_b}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= 上台 / 投票 / 揭晓 ================= */
function SpotScene({
  phase,
  player,
  players,
  votes,
  left,
}: {
  phase: string;
  player: Player;
  players: Player[];
  votes: { voter_id: string; choice: string }[];
  left: number;
}) {
  const { t } = useLang();
  const revealed = phase === "reveal";
  const truth = player.revealed_truth;
  const total = votes.length;
  const nA = votes.filter((v) => v.choice === "A").length;
  const nB = total - nA;
  const rightN = truth === "A" ? nA : nB;
  const fooledPct = total ? Math.round(((total - rightN) / total) * 100) : 0;
  const voters = players.filter((p) => p.id !== player.id);
  const votedIds = new Set(votes.map((v) => v.voter_id));
  const pct = left > 0 ? Math.min(100, (left / VOTE_SECONDS) * 100) : 0;

  const cardClass = (k: "A" | "B") => {
    if (!revealed || !truth) return "";
    return truth === k ? " is-true revealed" : " is-fake revealed";
  };

  return (
    <div className="scene">
      <div className="spot-scene">
        <div className="spot-head">
          <div className="spot-ava">{player.avatar}</div>
          <div>
            <div className="spot-name">{player.name}</div>
            <div className="spot-hint">
              {phase === "stage"
                ? t("spot.hint.stage")
                : phase === "voting"
                  ? t("spot.hint.voting")
                  : t("spot.hint.reveal")}
            </div>
          </div>
        </div>

        <div className="cards">
          {(["A", "B"] as const).map((k) => {
            const n = k === "A" ? nA : nB;
            const isTrue = truth === k;
            return (
              <div key={k} className={`story ${k === "A" ? "left" : "right"}${cardClass(k)}`}>
                <div className="glow" />
                <div className="chead">
                  <div className="badge">{k}</div>
                  <div className="votecount">
                    {t("spot.votecount", { n, pct: total ? Math.round((n / total) * 100) : 0 })}
                  </div>
                </div>
                <div className="txt">{k === "A" ? player.story_a : player.story_b}</div>
                <div className="stampslot">
                  {revealed && truth && (
                    <div className={`stamp show ${isTrue ? "true" : "fake"}`}>
                      {isTrue ? "TRUE" : "FAKE"}
                    </div>
                  )}
                </div>
                <div className="tally">
                  <i style={{ width: revealed && total ? `${(n / total) * 100}%` : 0 }} />
                </div>
              </div>
            );
          })}
        </div>

        {phase === "voting" && (
          <div className="votebar">
            <div className="ring" style={{ "--p": pct } as React.CSSProperties}>
              <span>{left}</span>
            </div>
            <div className="dots">
              {voters.map((v) => (
                <div key={v.id} className={`dot${votedIds.has(v.id) ? " done" : ""}`}>
                  {v.avatar}
                </div>
              ))}
            </div>
            <div className="votestat">{t("spot.voted", { n: total, total: voters.length })}</div>
          </div>
        )}

        {revealed && (
          <div className="verdict">
            {fooledPct > 50
              ? t("spot.master", { name: player.name, pct: fooledPct })
              : t("spot.detective", { pct: fooledPct, n: rightN })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= 榜单 ================= */
const MEDALS = ["🥇", "🥈", "🥉"];

function BoardScene({ players }: { players: Player[] }) {
  const { t } = useLang();
  const ranked = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const max = Math.max(1, ...ranked.map((p) => p.score ?? 0));
  const liar = [...players]
    .filter((p) => p.turn_done)
    .sort((a, b) => (b.fooled_pct ?? 0) - (a.fooled_pct ?? 0))[0];
  const detective = [...players].sort((a, b) => (b.correct_count ?? 0) - (a.correct_count ?? 0))[0];

  return (
    <div className="scene">
      <div className="board">
        <div className="board-head">
          <div>
            <div className="wordmark" style={{ fontSize: "clamp(22px,2.8vw,40px)" }}>
              {t("board.title")}
            </div>
            <div className="sub-cn" style={{ fontSize: 11, letterSpacing: ".28em", marginTop: 4 }}>
              {t("board.rule")}
            </div>
          </div>
          <div className="awards">
            <div className="award">
              <div className="icon">😈</div>
              <div>
                <div className="lab">{t("board.liar")}</div>
                <div className="who">{liar ? `${liar.avatar} ${liar.name}` : "—"}</div>
                <div className="meta">{t("board.liar.meta", { pct: liar?.fooled_pct ?? 0 })}</div>
              </div>
            </div>
            <div className="award">
              <div className="icon">🕵️</div>
              <div>
                <div className="lab">{t("board.detective")}</div>
                <div className="who">
                  {detective ? `${detective.avatar} ${detective.name}` : "—"}
                </div>
                <div className="meta">
                  {t("board.detective.meta", { n: detective?.correct_count ?? 0 })}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="rows">
          {ranked.map((p, i) => (
            <div
              key={p.id}
              className={`row${i === 0 ? " top1" : ""}`}
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="rank">{i + 1}</div>
              <div className="medal">{MEDALS[i] ?? ""}</div>
              <div className="ava">{p.avatar}</div>
              <div className="rname">{p.name}</div>
              <div className="barwrap">
                <i style={{ width: `${((p.score ?? 0) / max) * 100}%` }} />
              </div>
              <div className="score">{p.score ?? 0}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
