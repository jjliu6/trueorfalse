import { useEffect, useRef, useState } from "react";
import { useConfetti } from "@/components/tof/Confetti";
import { useSound } from "@/hooks/useSound";
import type { Lang } from "@/lib/i18n";
import { DEMO_SETS } from "@/lib/demoData";
import type { Phase, Player, Vote } from "@/lib/tof";

export const DEMO_VOTE_SECONDS = 10;
const ROUNDS = 3;
/** 讲故事时长：留给"观众"读完两句话的时间 */
const STAGE_MS = 2400;
const REVEAL_MS = 3400;
const BOARD_MS = 5200;
const BETWEEN_ROUNDS_MS = 900;

type DemoState = {
  phase: Phase;
  players: Player[];
  votes: Vote[];
  currentId: string | null;
  spinning: boolean;
  spotId: string | null;
  pickedId: string | null;
  votingEndsAt: string | null;
  cycle: number;
};

function initState(): DemoState {
  return {
    phase: "lobby",
    players: [],
    votes: [],
    currentId: null,
    spinning: false,
    spotId: null,
    pickedId: null,
    votingEndsAt: null,
    cycle: 0,
  };
}

/**
 * 全自动演示引擎：纯前端造一批假玩家，自己跑完 故事墙→点名→投票→揭晓→榜单
 * 的完整流程，跑完一轮就从头再来一次，作为新用户落地页的"看得懂在玩什么"。
 * 不连 Supabase，不需要真人参与。
 */
export function useDemo(lang: Lang) {
  const snd = useSound();
  const { fire, ref: confettiRef } = useConfetti();
  const [state, setState] = useState<DemoState>(initState);
  const cancelledRef = useRef(false);
  const timeouts = useRef<number[]>([]);
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    cancelledRef.current = false;

    const alive = () => !cancelledRef.current;
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = window.setTimeout(resolve, ms);
        timeouts.current.push(id);
      });

    void (async function loop() {
      let cycle = 0;
      while (alive()) {
        await runCycle(cycle);
        cycle++;
        if (!alive()) return;
        await sleep(BOARD_MS);
      }
    })();

    async function runCycle(cycle: number) {
      const deck = DEMO_SETS[langRef.current];
      const truths: Record<string, "A" | "B"> = {};
      const mkId = (i: number) => `demo-${cycle}-${i}`;

      // cur 是这一轮的唯一数据源；commit() 把它同步给 React state 触发渲染
      const cur: DemoState = initState();
      cur.cycle = cycle;
      const commit = () => {
        if (!alive()) return;
        setState({ ...cur, players: [...cur.players], votes: [...cur.votes] });
      };
      commit();
      await sleep(600);
      if (!alive()) return;

      // 依次贴出便利贴
      for (let i = 0; i < deck.length; i++) {
        if (!alive()) return;
        const seed = deck[i]!;
        const truth: "A" | "B" = Math.random() > 0.5 ? "A" : "B";
        const id = mkId(i);
        truths[id] = truth;
        const p: Player = {
          id,
          room_id: "demo",
          name: seed.name,
          avatar: seed.avatar,
          story_a: seed.a,
          story_b: seed.b,
          submitted: true,
          score: 0,
          turn_done: false,
          correct_count: 0,
          fooled_pct: 0,
          revealed_truth: null,
          created_at: null,
        };
        cur.players.push(p);
        commit();
        snd.join();
        await sleep(420);
      }
      if (!alive()) return;
      await sleep(1000);

      const rounds = Math.min(ROUNDS, cur.players.length);
      for (let r = 0; r < rounds; r++) {
        if (!alive()) return;
        await spinAndPick(cur, commit, sleep, alive);
        if (!alive()) return;
        await sleep(STAGE_MS);
        if (!alive()) return;
        await voteRound(cur, truths, commit, sleep, alive);
        if (!alive()) return;
        await revealRound(cur, truths, commit, sleep, alive, snd, fire);
        if (!alive()) return;
        if (r < rounds - 1) {
          cur.phase = "lobby";
          cur.currentId = null;
          commit();
          await sleep(BETWEEN_ROUNDS_MS);
        }
      }
      if (!alive()) return;
      cur.phase = "board";
      cur.currentId = null;
      commit();
      snd.fanfare();
      fire(150);
      await sleep(500);
      if (alive()) fire(120);
    }

    async function spinAndPick(
      cur: DemoState,
      commit: () => void,
      sleep: (ms: number) => Promise<void>,
      alive: () => boolean,
    ) {
      const remaining = cur.players.filter((p) => !p.turn_done);
      if (!remaining.length) return;
      const target = remaining[Math.floor(Math.random() * remaining.length)]!;
      cur.spinning = true;
      cur.pickedId = null;
      cur.spotId = null;
      commit();
      let delay = 55;
      let i = Math.floor(Math.random() * remaining.length);
      for (;;) {
        i = (i + 1) % remaining.length;
        cur.spotId = remaining[i]!.id;
        commit();
        snd.roll();
        delay *= 1.14;
        if (delay > 300) break;
        await sleep(delay);
        if (!alive()) return;
      }
      cur.spotId = target.id;
      cur.pickedId = target.id;
      commit();
      snd.ding();
      await sleep(900);
      if (!alive()) return;
      cur.spinning = false;
      cur.spotId = null;
      cur.pickedId = null;
      cur.phase = "stage";
      cur.currentId = target.id;
      commit();
    }

    async function voteRound(
      cur: DemoState,
      truths: Record<string, "A" | "B">,
      commit: () => void,
      sleep: (ms: number) => Promise<void>,
      alive: () => boolean,
    ) {
      const player = cur.players.find((p) => p.id === cur.currentId);
      if (!player) return;
      const truth = truths[player.id]!;
      const others = cur.players.filter((p) => p.id !== player.id);
      const endsAt = new Date(Date.now() + DEMO_VOTE_SECONDS * 1000).toISOString();
      cur.phase = "voting";
      cur.votingEndsAt = endsAt;
      commit();

      // 打乱投票顺序，让票数在投票窗口里陆续跳出来，而不是齐刷刷一次全到
      const order = [...others].sort(() => Math.random() - 0.5);
      const spread = (DEMO_VOTE_SECONDS * 1000 * 0.75) / Math.max(1, order.length);
      for (const voter of order) {
        if (!alive()) return;
        await sleep(150 + Math.random() * spread);
        if (!alive()) return;
        // 58% 的人会被骗，跟真人局的喜剧效果对齐
        const guess: "A" | "B" = Math.random() > 0.42 ? (truth === "A" ? "B" : "A") : truth;
        cur.votes.push({
          id: `${player.id}-v-${voter.id}`,
          room_id: "demo",
          target_id: player.id,
          voter_id: voter.id,
          choice: guess,
        });
        commit();
      }
      const remainMs = new Date(endsAt).getTime() - Date.now();
      if (remainMs > 0) await sleep(remainMs);
    }

    async function revealRound(
      cur: DemoState,
      truths: Record<string, "A" | "B">,
      commit: () => void,
      sleep: (ms: number) => Promise<void>,
      alive: () => boolean,
      sound: ReturnType<typeof useSound>,
      fireConfetti: (n?: number) => void,
    ) {
      const player = cur.players.find((p) => p.id === cur.currentId);
      if (!player) return;
      const truth = truths[player.id]!;
      const roundVotes = cur.votes.filter((v) => v.target_id === player.id);
      const total = roundVotes.length || 1;
      const right = roundVotes.filter((v) => v.choice === truth).length;
      const fooledPct = Math.round(((total - right) / total) * 100);

      cur.players = cur.players.map((p) => {
        if (p.id === player.id) {
          return {
            ...p,
            revealed_truth: truth,
            turn_done: true,
            fooled_pct: fooledPct,
            score: (p.score ?? 0) + (fooledPct >= 50 ? 2 : 0),
          };
        }
        const voted = roundVotes.find((v) => v.voter_id === p.id);
        if (voted && voted.choice === truth) {
          return { ...p, score: (p.score ?? 0) + 1, correct_count: (p.correct_count ?? 0) + 1 };
        }
        return p;
      });
      cur.phase = "reveal";
      cur.votingEndsAt = null;
      commit();
      sound.boom();
      await sleep(260);
      if (!alive()) return;
      sound.chime();
      fireConfetti(150);
      await sleep(REVEAL_MS);
    }

    return () => {
      cancelledRef.current = true;
      timeouts.current.forEach((id) => window.clearTimeout(id));
      timeouts.current = [];
    };
    // 只在挂载时启动一次循环；lang 变化通过 langRef 读取最新值，不重启整个演示
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, muted: snd.muted, setMuted: snd.setMuted, confettiRef };
}
