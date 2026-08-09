-- 两处"先插主表、客户端再补插一条关联密钥"的写法都有同一个竞态窗口：
-- 两次 insert 中间隔着一次网络往返，谁先抢着把关联密钥/答案写进去就算谁的。
--   1) rooms → room_hosts：房间刚建好、host_key 还没补插时，
--      别人抢先给这个 room_id 插一条自己的 host_key，房间的主持人身份就被抢走了
--   2) players → player_secrets：玩家刚提交、truth 还没补插时，
--      别人能抢先给这个 player_id 插一条自己编的 truth
-- 改成各自一个 SECURITY DEFINER 函数，两条 insert 在同一次数据库调用里原子完成，
-- 中间没有网络往返、也就没有竞态窗口。原来的直接 insert 权限收回，
-- 只能通过这两个函数写，别的路径都堵死。

create or replace function public.create_room_with_host(p_code text, p_key text)
returns public.rooms
language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  insert into public.rooms (code) values (p_code) returning * into r;
  insert into public.room_hosts (room_id, host_key) values (r.id, p_key);
  return r;
end; $$;

grant execute on function public.create_room_with_host(text, text) to anon, authenticated;

revoke insert on public.room_hosts from anon, authenticated;
drop policy if exists "room_hosts_insert" on public.room_hosts;

create or replace function public.submit_player(
  p_room_id uuid,
  p_name text,
  p_avatar text,
  p_story_a text,
  p_story_b text,
  p_truth text
)
returns public.players
language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  if p_truth not in ('A', 'B') then
    raise exception 'invalid truth value';
  end if;
  insert into public.players (room_id, name, avatar, story_a, story_b, submitted)
  values (p_room_id, p_name, p_avatar, p_story_a, p_story_b, true)
  returning * into p;
  insert into public.player_secrets (player_id, truth) values (p.id, p_truth);
  return p;
end; $$;

grant execute on function public.submit_player(uuid, text, text, text, text, text) to anon, authenticated;

revoke insert on public.player_secrets from anon, authenticated;
drop policy if exists "secrets_insert" on public.player_secrets;
