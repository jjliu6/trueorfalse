import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Backdrop } from "@/components/tof/Backdrop";
import { ConfettiCanvas } from "@/components/tof/Confetti";
import { BoardView } from "@/components/tof/BoardView";
import { LobbyScene, SpotScene, PHASE_LABEL_KEY } from "@/components/tof/GameScenes";
import { useCountdown } from "@/hooks/useRoom";
import { useDemo, DEMO_VOTE_SECONDS } from "@/hooks/useDemo";
import { buildSnapshot } from "@/lib/records";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "自动演示 · TRUE or FALSE 真真假假" },
      {
        name: "description",
        content: "15 秒看懂整局玩法：故事墙、点名、投票倒计时与最终榜单全自动播放。",
      },
      { property: "og:title", content: "自动演示 · TRUE or FALSE 真真假假" },
      { property: "og:description", content: "不用凑人数，先看一遍全自动演示再开局。" },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const { t, lang } = useLang();
  const demo = useDemo(lang);
  const left = useCountdown(demo.votingEndsAt);
  const phase = demo.phase;
  const current = useMemo(
    () => demo.players.find((p) => p.id === demo.currentId) ?? null,
    [demo.players, demo.currentId],
  );

  useEffect(() => {
    document.body.classList.add("tof-lock");
    return () => document.body.classList.remove("tof-lock");
  }, []);

  const snapshot = useMemo(
    () =>
      buildSnapshot(
        "DEMO",
        demo.players.filter((p) => p.turn_done),
      ),
    [demo.players],
  );

  const joinUrl = typeof window === "undefined" ? "" : `${window.location.origin}/play/DEMO`;

  return (
    <>
      <Backdrop />
      <ConfettiCanvas canvasRef={demo.confettiRef} />
      <div className="screen-root">
        {phase === "lobby" && (
          <LobbyScene
            code="DEMO"
            joinUrl={joinUrl}
            players={demo.players}
            pickable={false}
            spinning={demo.spinning}
            spotId={demo.spotId}
            pickedId={demo.pickedId}
            onPick={() => undefined}
          />
        )}
        {(phase === "stage" || phase === "voting" || phase === "reveal") && current && (
          <SpotScene
            phase={phase}
            player={current}
            players={demo.players}
            votes={demo.votes.filter((v) => v.target_id === current.id)}
            left={left}
            voteSeconds={DEMO_VOTE_SECONDS}
          />
        )}
        {phase === "board" && (
          <div className="scene">
            <BoardView players={snapshot.players} caption={t("board.rule")} />
          </div>
        )}

        <div className="demo-banner">
          <span className="demo-banner-dot" />
          <span>{t("demo.banner", { phase: t(PHASE_LABEL_KEY[phase]!) })}</span>
          <Link className="minibtn" to="/">
            {t("demo.cta")}
          </Link>
        </div>
      </div>
    </>
  );
}
