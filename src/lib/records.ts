import type { Player } from "@/lib/tof";

export type RecordPlayer = {
  id: string;
  name: string;
  avatar: string | null;
  score: number;
  correct_count: number;
  fooled_pct: number;
  story_a: string | null;
  story_b: string | null;
  revealed_truth: string | null;
};

export type GameSnapshot = {
  version: 1;
  code: string;
  players: RecordPlayer[];
};

export function buildSnapshot(code: string, players: Player[]): GameSnapshot {
  return {
    version: 1,
    code,
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score ?? 0,
      correct_count: p.correct_count ?? 0,
      fooled_pct: p.fooled_pct ?? 0,
      story_a: p.story_a,
      story_b: p.story_b,
      revealed_truth: p.revealed_truth,
    })),
  };
}

export function isSnapshot(value: unknown): value is GameSnapshot {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as GameSnapshot).players)
  );
}