import { supabase } from "@/integrations/supabase/client";

export type Phase = "lobby" | "stage" | "voting" | "reveal" | "board";

export type Room = {
  id: string;
  code: string;
  host_key: string;
  phase: string;
  current_player_id: string | null;
  voting_ends_at: string | null;
};

export type Player = {
  id: string;
  room_id: string;
  name: string;
  avatar: string | null;
  story_a: string | null;
  story_b: string | null;
  submitted: boolean | null;
  score: number | null;
  turn_done: boolean | null;
  correct_count: number | null;
  fooled_pct: number | null;
  revealed_truth: string | null;
  created_at: string | null;
};

export type Vote = {
  id: string;
  room_id: string;
  target_id: string;
  voter_id: string;
  choice: string;
};

export const AVATARS = [
  "🦊", "🐧", "🐼", "🦄", "🐯", "🐙", "🐳", "🦉", "🐝", "🦩", "🐨", "🐸",
];

export const playerKey = (code: string) => `tof_player_${code.toUpperCase()}`;

/** 稳定的伪随机：同一个 id 永远得到同一个歪斜角度 */
export function hashSeed(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function noteStyle(id: string, index: number) {
  const s = hashSeed(id);
  const rot = (((s % 1000) / 1000) * 9 - 4.5).toFixed(2);
  const dy = ((((s >> 10) % 1000) / 1000) * 28 - 14).toFixed(1);
  const trot = ((((s >> 20) % 1000) / 1000) * 14 - 7).toFixed(1);
  return {
    "--rot": `${rot}deg`,
    "--dy": `${dy}px`,
    "--trot": `${trot}deg`,
    "--i": index,
  } as React.CSSProperties;
}

export const wallCols = (n: number) => Math.min(5, Math.max(2, Math.ceil(n / 2)));

export function makeCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 4; i++) out += letters[Math.floor(Math.random() * letters.length)]!;
  return `TF${out}`;
}

export function makeHostKey() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export async function fetchRoomByCode(code: string) {
  const { data } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  return (data as Room | null) ?? null;
}