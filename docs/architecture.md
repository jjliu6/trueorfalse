# Architecture

## Why a database at all

11 devices are involved (1 laptop driving the projector + 10 phones), each running its own browser with no visibility into the others' memory. When someone submits their story on their phone, the projector has no idea it happened until something in the middle relays it.

```
Player's phone  ──write──▶  ┌──────────┐  ──push──▶  Big screen / projector
Another phone   ──write──▶  │ Supabase │  ──push──▶  Everyone else's phones
Host            ──write──▶  └──────────┘
```

Supabase provides the three things this needs:

- **Postgres** — stores rooms, players, stories, votes
- **Realtime** — every connected device is pushed a notification the moment data changes, instead of polling
- **RLS (Row Level Security)** — controls who can see which rows, which is how answers stay hidden until reveal

## Schema

Defined in [`supabase/migrations`](../supabase/migrations); apply with the Supabase CLI or paste into the SQL Editor. Key tables:

- `rooms` — one row per event; `phase` is the master switch (`lobby|stage|voting|reveal|board`) driving what every screen renders
- `players` — public info only, **no answers**
- `player_secrets` — the actual true/false answer, insert-only via RLS (see below)
- `votes` — unique on `(target_id, voter_id)`, upserted so a vote can be changed

### Why `player_secrets` is a separate table

If the answer lived directly on `players`, anyone with browser devtools open could read it straight off the row the client fetches — and at a hackathon, someone will try. `player_secrets` has an INSERT policy and **no SELECT policy at all**, so no frontend can ever query it. The two database functions `reveal_truth()` and `settle_round()` run as `security definer`, bypassing RLS, and are the only path that ever reads or releases the answer — and only at the moment of reveal.

## Routes

Route | Who opens it | What it does
--- | --- | ---
`/` | Participants | Enter the room code → jump to `/play/:code`
`/play/:code` | Participants' phones | A state machine that follows `room.phase` and switches screens automatically
`/screen/:code?k=xxx` | Host's laptop → projector | The big screen + the hidden control bar

- The `?k=` parameter must match `rooms.host_key` for the control bar to render. Without it, `/screen/HACK26` is read-only — pressing spacebar does nothing. This means casting the big-screen link to another phone can't accidentally break the flow.
- No login: after the first submission, `player.id` is saved in `localStorage`, so a refresh still recognizes who they are. That's sufficient for a 10-person icebreaker game.
