import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Backdrop } from "@/components/tof/Backdrop";
import { ConfettiCanvas, useConfetti } from "@/components/tof/Confetti";
import { useCountdown, useRoom } from "@/hooks/useRoom";
import { useSound } from "@/hooks/useSound";
import type { Player } from "@/lib/tof";
import { useLang } from "@/lib/i18n";
import { BoardView } from "@/components/tof/BoardView";
import { buildSnapshot } from "@/lib/records";
import { useSession } from "@/hooks/useSession";
import { LobbyScene, SpotScene, PHASE_LABEL_KEY, VOTE_SECONDS } from "@/components/tof/GameScenes";

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

function ScreenPage() {
  const { code } = Route.useParams();
  const { k } = Route.useSearch();
  const { t } = useLang();
  const upper = code.toUpperCase();
  const { room, players, votes, loading, missing } = useRoom(upper);
  const snd = useSound();
  const { fire, ref: confettiRef } = useConfetti();

  // host_key 不再放在 rooms 表里公开可读，只能靠这个 RPC 校验——
  // 它只回答"对不对"，不会把真实的 key 吐出来
  const [isHost, setIsHost] = useState(false);
  useEffect(() => {
    if (!room || !k) {
      setIsHost(false);
      return;
    }
    let alive = true;
    void supabase
      .rpc("verify_host_key", { p_room_id: room.id, p_key: k })
      .then(({ data }) => alive && setIsHost(data === true));
    return () => {
      alive = false;
    };
    // 故意只依赖 room?.id 而不是整个 room：room 每次实时更新（phase/current_player_id…）
    // 都会是个新对象引用，校验结果只跟"是哪个房间"有关，没必要跟着 phase 变化重新校验
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, k]);

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
        {phase === "board" && <BoardScene code={upper} players={submitted} hostKey={k} />}

        <a
          className="screen-footer"
          href="https://philosophie.ai"
          target="_blank"
          rel="noopener noreferrer"
        >
          Created by Eric Liu from Philosophie AI
        </a>

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

/* ================= 榜单 ================= */
function BoardScene({
  code,
  players,
  hostKey,
}: {
  code: string;
  players: Player[];
  hostKey: string | undefined;
}) {
  const { t } = useLang();
  const boardRef = useRef<HTMLDivElement>(null);
  const { session, ready } = useSession();
  const [busy, setBusy] = useState<"save" | "png" | null>(null);
  const [tip, setTip] = useState("");
  const snapshot = useMemo(() => buildSnapshot(code, players), [code, players]);

  // 带上 k，登录/注册确认后跳回来还是主持人身份，不用重新找回房间链接
  const backTo = `/screen/${code}${hostKey ? `?k=${encodeURIComponent(hostKey)}` : ""}`;
  const gateHref = `/auth?redirect=${encodeURIComponent(backTo)}`;

  const save = async () => {
    if (!session) return;
    setBusy("save");
    setTip("");
    const { error } = await supabase.from("game_records").insert({
      user_id: session.user.id,
      room_code: code,
      title: `${code} · ${players.length} 人`,
      snapshot: snapshot as unknown as never,
    });
    setBusy(null);
    setTip(error ? t("board.save.err", { msg: error.message }) : t("board.save.ok"));
  };

  const exportPng = async () => {
    if (!session || !boardRef.current) return;
    setBusy("png");
    setTip("");
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(boardRef.current, {
        pixelRatio: 2,
        backgroundColor: "#0a0b14",
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = url;
      a.download = `真真假假-${code}-战报.png`;
      a.click();
      setTip(t("board.export.ok"));
    } catch {
      setTip(t("board.export.err"));
    }
    setBusy(null);
  };

  return (
    <div className="scene">
      <BoardView ref={boardRef} players={snapshot.players} />
      <div className="board-actions">
        {!ready ? null : session ? (
          <>
            <button className="minibtn" disabled={busy !== null} onClick={() => void save()}>
              {busy === "save" ? t("board.save.busy") : t("board.save")}
            </button>
            <button className="minibtn" disabled={busy !== null} onClick={() => void exportPng()}>
              {busy === "png" ? t("board.export.busy") : t("board.export")}
            </button>
            <a className="minibtn" href="/history">
              {t("board.history")}
            </a>
          </>
        ) : (
          <>
            <span className="board-gate">{t("board.gate")}</span>
            <a className="minibtn" href={gateHref}>
              {t("board.login")}
            </a>
          </>
        )}
        {tip && <span className="board-gate">{tip}</span>}
      </div>
    </div>
  );
}
