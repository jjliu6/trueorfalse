import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Player, Room, Vote } from "@/lib/tof";

/** 订阅一个房间的全部实时状态：room / players / votes。不轮询。 */
export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    const upper = code.toUpperCase();

    const loadAll = async () => {
      const { data: r } = await supabase.from("rooms").select("*").eq("code", upper).maybeSingle();
      if (!active) return;
      if (!r) {
        setMissing(true);
        setLoading(false);
        return;
      }
      const roomRow = r as Room;
      setRoom(roomRow);
      const [{ data: p }, { data: v }] = await Promise.all([
        supabase.from("players").select("*").eq("room_id", roomRow.id).order("created_at"),
        supabase.from("votes").select("*").eq("room_id", roomRow.id),
      ]);
      if (!active) return;
      setPlayers((p ?? []) as Player[]);
      setVotes((v ?? []) as Vote[]);
      setLoading(false);
      return roomRow.id;
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;

    void loadAll().then((roomId) => {
      if (!active || !roomId) return;
      channel = supabase
        .channel(`tof_${roomId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
          (payload) => {
            if (payload.eventType === "DELETE") return;
            setRoom(payload.new as Room);
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
          (payload) => {
            setPlayers((prev) => {
              if (payload.eventType === "DELETE") {
                const old = payload.old as Player;
                return prev.filter((x) => x.id !== old.id);
              }
              const row = payload.new as Player;
              const i = prev.findIndex((x) => x.id === row.id);
              if (i === -1) return [...prev, row];
              const next = prev.slice();
              next[i] = row;
              return next;
            });
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "votes", filter: `room_id=eq.${roomId}` },
          (payload) => {
            setVotes((prev) => {
              if (payload.eventType === "DELETE") {
                const old = payload.old as Vote;
                return prev.filter((x) => x.id !== old.id);
              }
              const row = payload.new as Vote;
              const i = prev.findIndex((x) => x.id === row.id);
              if (i === -1) return [...prev, row];
              const next = prev.slice();
              next[i] = row;
              return next;
            });
          },
        )
        .subscribe();
    });

    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [code]);

  return { room, players, votes, loading, missing, setVotes };
}

/** 所有端都读 voting_ends_at 这个时间戳自己算剩余秒数，倒计时才不会各飘各的 */
export function useCountdown(endsAt: string | null | undefined) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!endsAt) {
      setLeft(0);
      return;
    }
    const end = new Date(endsAt).getTime();
    const tick = () => setLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [endsAt]);
  return left;
}