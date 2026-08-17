import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Player, Room, Vote } from "@/lib/tof";

/** 断线后多久重连一次：短暂抖动马上重试，一直失败就退避，别把移动网络打爆 */
const RECONNECT_DELAYS_MS = [500, 1500, 4000, 8000];

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
    let reconnectAttempt = 0;
    let reconnectTimer = 0;
    // 每次重连都要开一条新 channel（同名 channel 状态卡死后没法直接复用），
    // 用递增的 tag 避免新旧 channel 撞名
    let connectTag = 0;

    const openChannel = (roomId: string) => {
      const tag = ++connectTag;
      const ch = supabase
        .channel(`tof_${roomId}_${tag}`)
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
          if (!active || tag !== connectTag) return;
          if (status === "SUBSCRIBED") {
            reconnectAttempt = 0;
            void loadAll(roomId);
            return;
          }
          // CHANNEL_ERROR / TIMED_OUT / CLOSED：连接断了但没人告诉 React，
          // 页面就这么静静地卡在最后一次收到的状态上，用户会以为"投票没反应"。
          // 这里主动退避重连，而不是等用户自己意识到要刷新页面。
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            const delay =
              RECONNECT_DELAYS_MS[Math.min(reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
            reconnectAttempt++;
            window.clearTimeout(reconnectTimer);
            reconnectTimer = window.setTimeout(() => {
              if (!active) return;
              void supabase.removeChannel(ch);
              channel = openChannel(roomId);
            }, delay);
          }
        });
      channel = ch;
      return ch;
    };

    let currentRoomId: string | null = null;

    // 手机锁屏/切后台再回来，或者网络从蜂窝切到 wifi，
    // websocket 经常悄悄断了但 channel 状态没变化——回到前台/网络恢复时强制拉一次最新快照兜底
    const resync = () => {
      if (!active || !currentRoomId) return;
      void loadAll(currentRoomId);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") resync();
    };
    window.addEventListener("online", resync);
    document.addEventListener("visibilitychange", onVisibility);

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
      currentRoomId = roomRow.id;
      openChannel(roomRow.id);
    })();

    return () => {
      active = false;
      window.clearTimeout(reconnectTimer);
      window.removeEventListener("online", resync);
      document.removeEventListener("visibilitychange", onVisibility);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [code]);

  return { room, players, votes, loading, missing, setVotes };
}

let clockOffsetPromise: Promise<number> | null = null;

/**
 * 测一次"本机时钟 - 服务器时钟"的偏移量。voting_ends_at 是别的设备（大屏）
 * 用它自己的 Date.now() 算出来存进数据库的绝对时间戳，每个玩家的手机又各自拿
 * 自己的 Date.now() 去跟这个时间戳比——只要有一台手机的系统时钟比别人快几秒，
 * 它的倒计时就会提前归零，投票按钮跟着提前变灰，且没有任何报错，
 * 表现就是"这个人总是投不上票"。用服务器时间校正后，"剩余秒数"对所有设备才是同一个数。
 */
async function measureClockOffset(): Promise<number> {
  const t0 = Date.now();
  const { data, error } = await supabase.rpc("server_now");
  const t1 = Date.now();
  if (error || !data) return 0;
  const serverMs = new Date(data as string).getTime();
  // 用往返耗时的中点估算请求发出那一刻的服务器时间，抵消掉网络延迟的影响
  const localMidpoint = (t0 + t1) / 2;
  return serverMs - localMidpoint;
}

/** 页面存活期间只测一次时钟偏移，多个组件共用同一个结果，避免重复发请求 */
export function useServerClockOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    let active = true;
    if (!clockOffsetPromise) clockOffsetPromise = measureClockOffset();
    void clockOffsetPromise.then((ms) => active && setOffset(ms));
    return () => {
      active = false;
    };
  }, []);
  return offset;
}

/** 所有端都读 voting_ends_at 这个时间戳自己算剩余秒数，倒计时才不会各飘各的。
 *  clockOffsetMs 是本机时钟相对服务器的偏移，校正后不同设备算出的"剩余秒数"才一致。 */
export function useCountdown(endsAt: string | null | undefined, clockOffsetMs = 0) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!endsAt) {
      setLeft(0);
      return;
    }
    const end = new Date(endsAt).getTime();
    let id = 0;
    const tick = () => {
      const secs = Math.max(0, Math.ceil((end - (Date.now() + clockOffsetMs)) / 1000));
      setLeft(secs);
      // 归零后就没必要继续每 200ms 唤醒渲染了
      if (secs === 0 && id) window.clearInterval(id);
    };
    tick();
    id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [endsAt, clockOffsetMs]);
  return left;
}
