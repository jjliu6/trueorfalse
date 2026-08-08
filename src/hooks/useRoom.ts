import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Player, Room, Vote } from "@/lib/tof";

/** 以 snapshot 为底，用 fresh 里的同 id 行覆盖，fresh 独有的行追加在后面 */
function mergeById<T extends { id: string }>(snapshot: T[], fresh: T[]): T[] {
  if (fresh.length === 0) return snapshot;
  const out = snapshot.slice();
  for (const row of fresh) {
    const i = out.findIndex((x) => x.id === row.id);
    if (i === -1) out.push(row);
    else out[i] = row;
  }
  return out;
}

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

    // 换房间码时把上一间房的残留状态清干净，否则会闪一下旧房间的内容
    setRoom(null);
    setPlayers([]);
    setVotes([]);
    setLoading(true);
    setMissing(false);

    const loadAll = async (roomId: string) => {
      const [{ data: p }, { data: v }] = await Promise.all([
        supabase.from("players").select("*").eq("room_id", roomId).order("created_at"),
        supabase.from("votes").select("*").eq("room_id", roomId),
      ]);
      if (!active) return;
      // 快照可能比订阅期间收到的实时行还旧，所以实时行优先
      setPlayers((prev) => mergeById((p ?? []) as Player[], prev));
      setVotes((prev) => mergeById((v ?? []) as Vote[], prev));
      setLoading(false);
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const { data: r } = await supabase.from("rooms").select("*").eq("code", upper).maybeSingle();
      if (!active) return;
      if (!r) {
        setMissing(true);
        setLoading(false);
        return;
      }
      const roomRow = r as Room;
      setRoom(roomRow);
      const roomId = roomRow.id;

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
        // 先订阅、订阅成功后再拉快照，中间发生的变更就不会漏掉
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void loadAll(roomId);
        });
    })();

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
    let id = 0;
    const tick = () => {
      const secs = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(secs);
      // 归零后就没必要继续每 200ms 唤醒渲染了
      if (secs === 0 && id) window.clearInterval(id);
    };
    tick();
    id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [endsAt]);
  return left;
}
