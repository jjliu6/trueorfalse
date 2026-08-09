-- host_key 之前直接躺在 rooms 表里，rooms 又是 select using(true) 的公开表，
-- 任何打开 F12 的人都能读到别人房间的主持人密钥。
-- 按 player_secrets 已经用过的模式：把密钥挪进一张只能 insert、不给 select 权限的表，
-- 校验改成走一个 SECURITY DEFINER 函数，只返回 true/false，永远不把密钥本身吐出来。

create table public.room_hosts (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  host_key text not null
);

alter table public.room_hosts enable row level security;

-- 只给 insert 权限，一条 select 策略都不写——跟 player_secrets 一样的 fail-closed 思路
create policy "room_hosts_insert" on public.room_hosts for insert with check (true);

grant insert on public.room_hosts to anon, authenticated;
grant all on public.room_hosts to service_role;

-- 把已有房间的 host_key 搬过去，再把公开表里的这一列删掉
insert into public.room_hosts (room_id, host_key)
select id, host_key from public.rooms where host_key is not null
on conflict (room_id) do nothing;

alter table public.rooms drop column host_key;

-- 校验函数：只回答"这个 key 是不是这个房间的主持人"，不返回真实的 key
create or replace function public.verify_host_key(p_room_id uuid, p_key text)
returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if p_key is null or p_key = '' then
    return false;
  end if;
  select exists(
    select 1 from public.room_hosts where room_id = p_room_id and host_key = p_key
  ) into ok;
  return coalesce(ok, false);
end; $$;

grant execute on function public.verify_host_key(uuid, text) to anon, authenticated;
