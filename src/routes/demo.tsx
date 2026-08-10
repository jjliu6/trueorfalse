import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Backdrop } from "@/components/tof/Backdrop";
import { ConfettiCanvas } from "@/components/tof/Confetti";
import { BoardView } from "@/components/tof/BoardView";
import { LobbyScene, SpotScene, PHASE_LABEL_KEY } from "@/components/tof/GameScenes";
import { useCountdown } from "@/hooks/useRoom";
import { useDemo, DEMO_VOTE_SECONDS } from "@/hooks/useDemo";
import { buildSnapshot } from "@/lib/records";
import { useLang } from "@/lib/i18n";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/demo")({
  head: () =>
    seo({
      title: "自动演示 · TRUE or FALSE 真真假假 | 15 秒看懂玩法",
      description:
        "不用凑人数，先看一遍真真假假全自动演示：故事墙、随机点名、投票倒计时与最终榜单一气呵成，15 秒看懂整局怎么玩。",
      path: "/demo",
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

  // 客户端才知道 origin，SSR 时留空，避免首屏文本不一致导致的 hydration 报错
  const [joinUrl, setJoinUrl] = useState("");
  useEffect(() => {
    setJoinUrl(`${window.location.origin}/play/DEMO`);
  }, []);

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

        {!demo.started && (
          <div className="demo-gate">
            <button className="btn" onClick={demo.start}>
              {t("demo.start")}
            </button>
            <p className="pdesc">{t("demo.start.hint")}</p>
          </div>
        )}
      </div>
    </>
  );
}
