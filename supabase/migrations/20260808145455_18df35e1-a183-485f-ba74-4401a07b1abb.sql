create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_key text not null,
  phase text not null default 'lobby',
  current_player_id uuid,
  voting_ends_at timestamptz,
  created_at timestamptz default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  avatar text default '🦊',
  story_a text check (char_length(story_a) <= 40),
  story_b text check (char_length(story_b) <= 40),
  submitted boolean default false,
  score int default 0,
  turn_done boolean default false,
  correct_count int default 0,
  fooled_pct int default 0,
  revealed_truth text,
  created_at timestamptz default now()
);

create table public.player_secrets (
  player_id uuid primary key references public.players(id) on delete cascade,
  truth text not null check (truth in ('A','B'))
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  target_id uuid not null references public.players(id) on delete cascade,
  voter_id uuid not null references public.players(id) on delete cascade,
  choice text not null check (choice in ('A','B')),
  created_at timestamptz default now(),
  unique (target_id, voter_id)
);

grant select, insert, update, delete on public.rooms to anon, authenticated;
grant select, insert, update, delete on public.players to anon, authenticated;
grant insert on public.player_secrets to anon, authenticated;
grant select, insert, update on public.votes to anon, authenticated;
grant all on public.rooms, public.players, public.player_secrets, public.votes to service_role;

alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.player_secrets enable row level security;
alter table public.votes enable row level security;

create policy "rooms_all" on public.rooms for all using (true) with check (true);
create policy "players_all" on public.players for all using (true) with check (true);
create policy "votes_read" on public.votes for select using (true);
create policy "votes_write" on public.votes for insert with check (true);
create policy "votes_update" on public.votes for update using (true) with check (true);
create policy "secrets_insert" on public.player_secrets for insert with check (true);

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.votes;
alter table public.rooms replica identity full;
alter table public.players replica identity full;
alter table public.votes replica identity full;

create or replace function public.reveal_truth(p_player uuid)
returns text language plpgsql security definer set search_path = public as $$
declare t text;
begin
  select truth into t from player_secrets where player_id = p_player;
  update players set revealed_truth = t where id = p_player;
  return t;
end; $$;

create or replace function public.settle_round(p_player uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t text; total int; right_n int;
begin
  select revealed_truth into t from players where id = p_player;
  if t is null then return; end if;
  if (select turn_done from players where id = p_player) then return; end if;

  select count(*) into total from votes where target_id = p_player;
  select count(*) into right_n from votes where target_id = p_player and choice = t;

  update players set score = score + 1, correct_count = correct_count + 1
   where id in (select voter_id from votes where target_id = p_player and choice = t);

  update players
     set turn_done = true,
         fooled_pct = case when total > 0
                           then round((total - right_n)::numeric / total * 100)::int else 0 end,
         score = score + case when total > 0 and right_n::numeric / total < 0.5 then 2 else 0 end
   where id = p_player;
end; $$;

grant execute on function public.reveal_truth(uuid) to anon, authenticated;
grant execute on function public.settle_round(uuid) to anon, authenticated;