# Truth or Lie

TRUE or FALSE

A complete build guide for an offline hackathon icebreaker game (Lovable + Supabase edition)

Companion file: true-or-false.html (an offline animated prototype — just double-click to open and see how it feels before building anything)

## 1. How the game is played

10 people, each writes one true story and one made-up story (two short stories total). Everyone else guesses which one is real.

There are only two screens: the big screen in front of the host (projector), and everyone's phone. There is no third "admin" screen.

Stage | Big screen (host's laptop → projector) | Phone (all participants)
--- | --- | ---
① Story wall (lobby) | The story wall is the main stage: every time someone submits, a crooked sticky note flies onto the wall with an avatar, name, and both stories. The QR code shrinks into the top-right corner | Enter a nickname → write two stories (40 characters each) → mark which one is true → submit
② Roll call | Random roll call (a marquee sweeps over everyone who hasn't gone yet and slows to a stop) or the host taps a sticky note directly | "XXX is up"
③ On stage | The current player's avatar rises up; two large cards (A/B) slide in from left and right | "XXX is telling their stories, listen up"
④ Voting | A 20s ring countdown with ticking sound, avatars light up one by one. Only the vote count is shown, never the distribution | Two big buttons, A / B
⑤ Reveal | A "boom" sound; the fake one gets stamped FAKE in red and fades to gray with a shake; the real one glows green with a TRUE stamp and confetti; the vote bar grows | "You guessed right / You got fooled" + this round's score
⑥ Back to wall | Players who've gone fade out on the wall with a green ✓, so it's obvious who's left | "Waiting for the next player"
⑦ Leaderboard | Two special awards (Best Liar / Best Detective) + a growing bar-chart leaderboard | Your own rank

The game loops: story wall → roll call → tell stories → vote → reveal → back to story wall, until every sticky note has faded, then it moves to the final leaderboard.

### Scoring and the two special awards

- Guessing one person correctly → +1 point
- If your fake story fools **more than half** of the room → +2 points ("Master Liar")
- 🏆 Best Liar = the person with the highest fooled percentage (only one per game)
- 🏆 Best Detective = the person with the most correct guesses

The "+2 for fooling more than half" rule is important — it gives storytellers a reason to actually put effort in instead of phoning it in. The two awards also mean different personality types each get their own moment in the spotlight — the good storytellers and the good readers of people.

**Why cap each story at 40 characters?** It forces people to write a hook instead of an essay. Forms fill out fast, the wall stays tidy, and the pacing stays snappy. The real detail is saved for when they tell it out loud on stage — that's the best part of the game anyway.

**Why hide the vote distribution while voting is open?** The moment people see "7 people picked A," everyone else piles on and the game falls apart. Showing only "7/9 voted" nudges people to vote without leaking any information.

**Why does this need sound effects?** An icebreaker game with sound is a completely different experience from one without. A ticking sound every second for the last 10 seconds of the countdown (louder and higher-pitched in the last 3), and a low "boom" at the reveal — these two sounds pull everyone's attention back to the screen automatically, so the host never has to shout "everyone look here."

**Pacing** (about 25 minutes for 10 people): 4 minutes to fill out the form → roughly 2 minutes per player (5s roll call / 60s telling the story / 20s voting / 40s reveal reactions) → 2 minutes for the leaderboard.

## 2. How the host operates it: one button on the big screen does everything

The big screen already runs on the host's laptop, so the control button lives directly on that screen — no separate admin page needed.

Design goals:

- **Fully hidden by default.** The audience just sees a clean screen with no buttons.
- Moving the mouse slides a control bar up from the bottom-right corner; it auto-hides again after 3.5 seconds of no activity (like a video player's controls).
- **There is only one main button: "Next."** Its label automatically changes to whatever the next action is for the current stage:

```
Story wall ──🎲 Random roll call──▶ On stage ──🗳 Start 20s voting──▶ Voting ──✨ Reveal──▶ Reveal
   ▲                                                                                │
   └──────────────── ← Back to story wall to pick someone ─────────────────────────┘
                                                (Everyone's gone → 🏆 Final leaderboard)
```

Roll call has two modes: press "🎲 Random roll call" and let the marquee spin to a stop on its own, or click a sticky note directly. Random is great for building suspense; clicking directly lets the host control the pacing — e.g. if the room's energy dips, pick whoever wrote the wildest story.

Pressing spacebar = Next (during the story-wall stage, spacebar triggers random roll call), so the host never has to touch the mouse. Left arrow = go back a step.

Four smaller buttons live in the control bar too: Back / Jump to leaderboard / 🔊 Sound toggle / Reset.

**Why not build a "remote control on your phone" instead?** That's possible, but it's overkill for an in-person projector setup — the host is already standing next to the laptop, and hitting spacebar is faster than pulling out a phone. If your host needs to walk around the room, add a `/remote/:code` page — the logic is identical to this control bar, just rendered somewhere else.

## 3. Look at the prototype first

Open `true-or-false.html`. In the top-right corner you can switch between 🖥 Big screen / 📱 Phone (this toggle only exists in the prototype, not in the real build).

In the big-screen view:

- Press **F** — simulate someone submitting (press it a few times to watch sticky notes fly onto the wall one by one)
- Press **Space** — advance to the next step (on the story wall this triggers random roll call, so you can watch the marquee)
- Click a sticky note directly — that person goes on stage immediately
- Move the mouse — reveals the control bar, which includes "⚡ Auto demo" to run through the whole flow automatically

⚠️ Turn your volume on. The countdown ticks and the reveal "boom" are both baked into the prototype (browsers require a click on the page before audio is allowed, so click anywhere once when you first open it).

All the data in the prototype is fake and only lives inside a single browser tab — nothing syncs across devices. Its purpose is to let you and your team validate the visuals and pacing before you build anything real, and to serve as a design reference.

## 4. Why you need a database (for beginners)

You might be thinking: isn't a single web page enough?

It's not — because there are 11 devices involved (1 laptop driving the projector + 10 phones), each running its own browser with no visibility into the others' memory. When someone submits their story on their phone, the laptop driving the projector has no idea it happened.

So you need a "middleman" that every device can connect to:

```
Player's phone  ──write──▶  ┌──────────┐  ──push──▶  Big screen / projector
Another phone   ──write──▶  │ Supabase │  ──push──▶  Everyone else's phones
Host            ──write──▶  └──────────┘
```

Supabase happens to provide exactly the three things this needs:

- **Database (Postgres)** — stores rooms, players, stories, votes
- **Realtime** — the moment data changes, every connected device is pushed a notification, instead of constantly polling "is there anything new?"
- **RLS (Row Level Security)** — controls who can see which rows, which is how the answers stay hidden

Lovable has Supabase integration built in, so connecting it takes a couple of clicks with no backend code required.

## 5. Database schema (paste this whole section into the Supabase SQL Editor)

### 5.1 Create tables

```sql
-- Rooms: one row per event. `phase` is the master switch for the whole game
create table public.rooms (
  id                uuid primary key default gen_random_uuid(),
  code              text unique not null,               -- room code, e.g. HACK26
  host_key          text not null,                      -- only the host knows this; it decides whether the control bar shows
  phase             text not null default 'lobby',      -- lobby|stage|voting|reveal|board
  current_player_id uuid,                               -- whose turn it currently is
  voting_ends_at    timestamptz,                        -- voting deadline (used to compute the countdown)
  created_at        timestamptz default now()
);

-- Players: publicly readable, but this table has NO answers in it
create table public.players (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references public.rooms(id) on delete cascade,
  name           text not null,
  avatar         text default '🦊',
  story_a        text check (char_length(story_a) <= 40),   -- hard 40-char cap, enforced at the DB level too
  story_b        text check (char_length(story_b) <= 40),
  submitted      boolean default false,
  score          int default 0,
  turn_done      boolean default false,   -- whether they've gone yet; drives the fade-out on the story wall
  correct_count  int default 0,           -- how many times they guessed right → Best Detective
  fooled_pct     int default 0,           -- what percentage they fooled in their own round → Best Liar
  revealed_truth text,          -- only written to 'A' or 'B' at the moment of reveal
  created_at     timestamptz default now()
);

-- Answers: a separate table, paired with RLS, so that NO frontend can ever read it
create table public.player_secrets (
  player_id uuid primary key references public.players(id) on delete cascade,
  truth     text not null check (truth in ('A','B'))
);

-- Votes: a unique constraint guarantees one vote per person, and votes can be changed (via upsert)
create table public.votes (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms(id) on delete cascade,
  target_id  uuid not null references public.players(id) on delete cascade,
  voter_id   uuid not null references public.players(id) on delete cascade,
  choice     text not null check (choice in ('A','B')),
  created_at timestamptz default now(),
  unique (target_id, voter_id)
);
```

### 5.2 Enable realtime

```sql
alter publication supabase_realtime add table public.rooms, public.players, public.votes;
-- replica identity full: makes UPDATE events carry the full row, which the frontend needs
alter table public.rooms   replica identity full;
alter table public.players replica identity full;
alter table public.votes   replica identity full;
```

### 5.3 Security policies (the most important part)

```sql
alter table public.rooms          enable row level security;
alter table public.players        enable row level security;
alter table public.player_secrets enable row level security;
alter table public.votes          enable row level security;

create policy "rooms_all"    on public.rooms   for all    using (true) with check (true);
create policy "players_all"  on public.players for all    using (true) with check (true);
create policy "votes_read"   on public.votes   for select using (true);
create policy "votes_write"  on public.votes   for insert with check (true);
create policy "votes_update" on public.votes   for update using (true) with check (true);

-- player_secrets only gets an INSERT policy — there is deliberately NO select policy at all
-- => submissions can write into it, but no frontend (including someone with devtools open) can ever query it
create policy "secrets_insert" on public.player_secrets for insert with check (true);
```

**What is this defending against?** If the answer were stored directly in the `players` table, anyone with browser devtools open could see the full row the server returns and read the answer straight off it — and at an actual hackathon, someone really will try that. Isolating the answer into a write-only table closes that hole at the root.

### 5.4 Two database functions

`security definer` means the function runs with the database owner's privileges, bypassing RLS. So the answer is only ever released through this function, and only at the moment of reveal.

```sql
-- Reveal: move the answer from the vault into the public table
create or replace function public.reveal_truth(p_player uuid)
returns text language plpgsql security definer set search_path = public as $$
declare t text;
begin
  select truth into t from player_secrets where player_id = p_player;
  update players set revealed_truth = t where id = p_player;
  return t;
end; $$;

-- Settle the round: compute scores (+1 for a correct guess; +2 for fooling more than half)
create or replace function public.settle_round(p_player uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t text; total int; right_n int;
begin
  select revealed_truth into t from players where id = p_player;
  if t is null then return; end if;

  select count(*) into total   from votes where target_id = p_player;
  select count(*) into right_n from votes where target_id = p_player and choice = t;

  -- Everyone who guessed right: +1 point, and +1 to their correct_count (used for Best Detective)
  update players set score = score + 1, correct_count = correct_count + 1
   where id in (select voter_id from votes where target_id = p_player and choice = t);

  -- The player whose turn it was: record what percentage they fooled (used for Best Liar), +2 if they fooled more than half
  update players
     set turn_done  = true,
         fooled_pct = case when total > 0
                           then round((total - right_n)::numeric / total * 100)::int else 0 end,
         score      = score + case when total > 0 and right_n::numeric / total < 0.5
                                   then 2 else 0 end
   where id = p_player;
end; $$;

grant execute on function public.reveal_truth(uuid) to anon;
grant execute on function public.settle_round(uuid) to anon;
```

## 6. Page structure (only three routes)

Route | Who opens it | What it does
--- | --- | ---
`/` | Participants | Enter the room code → jump to `/play/:code`
`/play/:code` | Participants' phones | A state machine that follows `room.phase` and switches screens automatically
`/screen/:code?k=xxx` | Host's laptop → projector | The big screen + the hidden control bar

**When does the control bar show up?** The `?k=` URL parameter has to match `rooms.host_key` for the control bar to render at all. Anyone without that parameter who opens `/screen/HACK26` just sees a read-only big screen — pressing spacebar does nothing. That way, if someone casts the big-screen link to their own phone, they can't accidentally break your flow.

**How are participants identified?** There's no login. After the first submission, `player.id` is saved in the browser's `localStorage`, so refreshing the page still recognizes who they are. That's plenty for a 10-person icebreaker game.

## 7. Build prompts (paste them one round at a time, three rounds total)

**Why split it into rounds?** Doing too much in one shot tends to go off the rails. Scaffold first → wire up the data → add animation last — each round can be verified before moving on, and it's easy to roll back if something breaks. Strongly recommended: before the third round, upload screenshots of the prototype (story wall / reveal / leaderboard) and say "match this visual style" — it makes a big difference.

### Round 1 · Scaffold

Build an in-person hackathon icebreaker game called "TRUE or FALSE," using React + Tailwind, fully localized UI.

Only three routes (no extra admin backend):
```
/                    Participants enter a room code to join
/play/:code          Participant's phone view, portrait-first
/screen/:code?k=xxx  Projector view, 16:9 landscape, large text, dark background; the host's controls live directly on this page
```

Visual direction: dark `#07070f` background, three slowly drifting blurred light blobs (purple `#7c5cff` / cyan `#22d3ee` / magenta `#ff3b6b`), frosted-glass cards, 28px rounded corners. True = mint green `#3ddc97`, false = magenta `#ff3b6b`, gold `#ffcf5c` for first place.

Build the static layout with hardcoded fake data first, no database wiring yet:

**[/screen lobby page]** — the story wall is the star, not the QR code
- Top row: logo "TRUE or FALSE" on the left, a pill showing "7 / 10 submitted" next to it, and a small join card on the far right (an ~86px QR code + room code + URL) — it's a supporting element, don't let it take up much space
- The middle area is the story wall: each person who has submitted is a "sticky note" showing avatar + name + story A + story B (show both stories, not just the name)
  - Each note has a small semi-transparent strip of "tape" at the top
  - Notes cycle through 5 semi-transparent colors (purple/cyan/pink/yellow/green) — don't make them all gray
  - **Important:** notes should look crooked, not perfectly aligned — randomly rotate each one -4.5°~+4.5° and offset it vertically -14px~+14px, so it looks like it was stuck on by hand
- Column count is computed from the number of players: `cols = min(5, max(2, ceil(count/2)))`, so up to 10 people always fits in two rows and the cards can stay large
- Players who've already gone fade to 26% opacity + 0.9 grayscale, with a green circular ✓ badge in the top-right corner
- Before anyone has submitted, the QR code enlarges to 250px and sits centered, with a line saying "write one true story and one made-up one — a single sentence is enough, save the details for when you tell it live"; once the first person submits, the QR code shrinks into the corner and the story wall expands

**[/screen on-stage page]** current player's avatar + name at the top, two large story cards (labeled A / B) below, an empty status bar reserved at the bottom
**[/screen leaderboard page]** top row: "🏆 Final Leaderboard" title on the left, two special-award cards side by side on the right (😈 Best Liar / 🕵️ Best Detective, each showing avatar + name + one line of description); 10 leaderboard rows below, each row showing [rank][medal][avatar][name][progress bar][score]. The whole page must fit within one 16:9 screen with no scrollbar
**[/play]** five steps: nickname → write two stories → waiting → voting → results
- The two story inputs both use `maxlength=40`, with a live "23/40" counter next to the label that turns yellow at ≥30 and red at 40

### Round 2 · Wire up Supabase + the host control bar

Connect Supabase and wire up real data against this schema (the SQL has already been run, the tables already exist):
```
rooms(id, code, host_key, phase, current_player_id, voting_ends_at)
players(id, room_id, name, avatar, story_a, story_b, submitted, score, turn_done, revealed_truth)
player_secrets(player_id, truth)   -- insert-only, the frontend can't read it, don't attempt to select it
votes(id, room_id, target_id, voter_id, choice)   -- unique on (target_id, voter_id)
```

Data behavior:
1. When a participant submits their stories: first insert into `players` (no answer), then use the returned id to insert into `player_secrets(player_id, truth)`. Store `player.id` in `localStorage` under the key `tof_player_<code>`.
2. Both pages subscribe to Supabase Realtime changes on `rooms` / `players` / `votes` and update state when events arrive — no polling.
3. `room.phase` is the single source of truth; `/play` and `/screen` both derive their UI from it, so they can never fall out of sync:
   ```
   lobby → fill out the form / story wall
   stage → "XXX is telling their stories" / two story cards
   voting → A|B vote buttons / countdown + vote count
   reveal → right/wrong / the stamp reveal
   board  → my rank / the leaderboard
   ```
4. Votes are written with an upsert keyed on `(target_id, voter_id)`, so changing your vote overwrites instead of erroring.
5. **Very important:** no page may ever show the vote distribution before `phase` becomes `reveal` — the big screen can only show "N / M voted." The A/B breakdown is only shown after the reveal.

Host control bar (built into the `/screen` page, no separate admin page):
- Only render the control bar when the `?k=` URL parameter matches `rooms.host_key`; otherwise the big screen is purely read-only
- Hidden by default; slides up from the bottom-right on `mousemove`, auto-hides after 3.5s of inactivity
- One main button whose label changes automatically with the current phase, and whose click performs the matching action:
  ```
  phase=lobby  → someone hasn't gone yet: "🎲 Random roll call" → randomly pick someone with turn_done=false
                 everyone's gone: "🏆 Final leaderboard" → phase='board'
  phase=stage  → "🗳 Start 20s voting" → phase='voting', voting_ends_at = now() + 20 seconds
  phase=voting → "✨ Reveal" → call rpc('reveal_truth') then rpc('settle_round') then phase='reveal'
  phase=reveal → someone hasn't gone yet: "← Back to story wall" → phase='lobby', current_player_id=null
                 everyone's gone: "🏆 Final leaderboard" → phase='board'
  phase=board  → button disabled, shows "✔ Game over"
  ```
  Next to the button, show small text with the current phase and a status line (e.g. "Story wall · 7 people left · or click a note directly")
- **Second way to pick who's next:** when `phase=lobby` and the viewer is the host, notes with `turn_done=false` are clickable directly — clicking one puts that person on stage (sets `current_player_id`, `phase='stage'`). Hovering adds a cyan outline and glow.
- Keyboard shortcuts: Space / → = next step (on lobby this triggers random roll call), ← = go back. Shortcuts are disabled while an input field is focused.
- Four smaller buttons in the control bar: Back / Jump to leaderboard / 🔊 Sound toggle / Reset
- When the control bar is hidden, leave a faint line of text in the bottom-right corner: "Press Space for next step"

For the countdown: don't run a separate timer per device — every device should read the `voting_ends_at` timestamp and compute the remaining seconds itself, so all 10 phones and the big screen stay in sync instead of drifting apart.

The two special awards on the leaderboard (computed from the `players` table, no new table needed):
- 😈 Best Liar = among players with `turn_done=true`, the one with the highest `fooled_pct`
- 🕵️ Best Detective = the player with the highest `correct_count`

### Round 3 · Add animation

Now add animation to the big screen using framer-motion. Reference the screenshots I uploaded.

**Story wall (lobby):**
- New note entrance: starts 80px below its resting position, scaled to 0.62, rotated to 5x its resting angle, then springs back to its own resting angle with easing `cubic-bezier(.16,1.15,.3,1)` over 0.75s
- When multiple notes arrive at once, stagger their entrance by 85ms each
- After landing, each note enters a slow 7-second "breathing" loop: rises 7px, rotation converges to 45% of its resting angle, repeating forever (the breathing keyframes must include the note's own rotation angle, or it'll snap upright)
- The just-submitted note gets an extra cyan ring that expands outward and fades, over 1.3s
- The room code uses a purple → cyan gradient with the gradient position animating continuously
- When the wall is empty, the large QR code pulses a purple glow ring every 3 seconds

**Random roll-call marquee** (this is the key interaction — nail the "spinning wheel slowing down" feel):
- Start by putting the story wall into a "spinning" state: all notes drop to 28% opacity + 0.6 grayscale
- Use a recursive `setTimeout` to highlight one note at a time (cyan 4px outline + 80px glow + 1.35x brightness) with a short electronic blip sound each time; start at a 55ms interval and multiply it by 1.14 after every step so it gradually slows down; stop once the interval exceeds 300ms, landing on the pre-randomized winner
- When it stops, switch that note to a gold outline + 120px gold glow, pop a small gold flag above it ("🎯 It's you!"), play a "ding," and hold for 0.9s before moving to the on-stage page
- **Important:** implement all of this highlighting with `box-shadow` / `filter` / `opacity`, not `transform` — otherwise it'll fight with the breathing animation over the same property and they'll visually clash

**On stage:** the player's avatar floats up and down on a 3.4s loop; card A slides in from the left with a 24deg Y-axis rotation, card B slides in from the right, 120ms later

**Voting:** a pill-shaped status bar at the bottom — a conic-gradient ring countdown on the left (computed from `voting_ends_at`), everyone's avatar dots in the middle (each one jumps from 35% opacity to fully bright once that person votes), and "4 / 9 voted" on the right

**Reveal (the emotional peak — go all out):**
- The fake card: fades, dims, shrinks to 0.94, shakes left-right for 0.5s, and gets stamped with a red FAKE stamp (dropping in from 2.6x scale, tilted -9deg, springy easing)
- The true card: border turns green, glows, scales up to 1.035, gets stamped with a green TRUE stamp
- Full-screen canvas confetti burst (~150 pieces, with gravity and rotation, fading out over 2s)
- Both cards grow a vote-share bar at the bottom, with "5 votes · 56%" in the top-right corner
- A conclusion line at the bottom: if fooled more than half, "😈 XXX fooled 56% of the room — Master Liar, +2 points"; otherwise "🕵️ Only 44% were fooled, 5 people saw through it — +1 point"
- Note: leave a 66px safe margin at the bottom for this text so it doesn't get covered by the host control bar

**Leaderboard:** rows slide in from the left, staggered 90ms each; score bars grow from 0 over 1s; first place gets a full gold gradient row and gold progress bar; the two special-award cards bounce in from below (scale 0.8 → 1, springy easing) delayed 0.35s / 0.55s; fire confetti twice on entry plus an ascending musical scale

Mobile also needs feedback: tapping an option scales it to 0.98, the selected state gets a cyan outline + glow; on reveal, "You got it right" bounces in with an emoji.

### Round 4 · Sound effects

Sound gets its own round because it tends to get lost in the shuffle of earlier rounds.

Add sound to the big screen. **Don't load any audio files** — synthesize everything live with the Web Audio API, so it still works even if the projector laptop loses its internet connection.

Write a `useSound` hook with these methods:
- `tick(strong)` — countdown tick: square wave, 900Hz normally / 1500Hz on emphasis, 45ms duration, volume 0.06 / 0.14
- `ding()` — selection/submission: triangle wave, 1568Hz + 2349Hz layered, 160ms duration
- `join()` — someone submitted and joined the wall: sine wave sliding from 880Hz to 1320Hz, 160ms duration, volume 0.07
- `boom()` — the reveal "boom": sine 160Hz exponentially sliding down to 46Hz (550ms) + sine 80→36Hz (700ms), layered with 300ms of low-pass white noise (700Hz cutoff, decaying volume), like a mallet strike
- `chime()` — the truth lighting up: four sine tones at 523/659/784/1046Hz, each staggered 75ms
- `roll()` — each tick of the marquee: square wave, random 600~1100Hz, 35ms, very quiet
- `fanfare()` — the final leaderboard: 523/659/784/1046/1319Hz in sequence, each staggered 110ms

Key implementation details:
1. Every sound's volume envelope must be "8ms linear attack → exponential decay to 0.0001" — never just switch an oscillator on and off, or you'll get a harsh "pop" that sounds terrible over speakers
2. Browsers require a user gesture before audio is allowed: create the `AudioContext` and call `resume()` on the first `pointerdown` / `keydown`, using `{once: true}`
3. Put a 🔊/🔇 toggle in the control bar; when muted, every method should just return immediately

When each sound should play:
- Someone submits and joins the wall → `join()`
- Each step of the marquee → `roll()`; landing on a selection → `ding()`
- Voting countdown: on each whole-second change, `tick(false)` at ≤10s, `tick(true)` at ≤3s, and `tick(true)` again at zero
- Pressing "Reveal" → `boom()`, then `chime()` 260ms later
- Entering the final leaderboard → `fanfare()`

## 8. Running it on the day of the event

**10 minutes before**

- Open `/screen/HACK26?k=<your host_key>` on the host's laptop, hit F11 for fullscreen, browser zoom at 100%
- Connect speakers, turn the volume up, click the page once (browsers require a click before audio is allowed). Press spacebar to check you can hear it
- Scan the QR code with your own phone once to confirm you can join and submit — don't skip this step
- Confirm the keyboard works (Space = next step)

**Kickoff**

Leave the big screen on the story wall page with the QR code centered, and say something like:

"Two stories, one true and one made up, 40 characters max each. Write a hook, not an essay — save the details for when you tell it live on stage. The more specific it sounds, the more real it feels, and the easier it is to fool people."

Once the first person submits, the QR code shrinks into the corner and the story wall expands. Notes fly onto the wall crooked, one by one — that's already the best icebreaker moment: people start reading each other's stories and razzing each other, and the energy builds on its own.

**Each round (advance with spacebar)**

- Space → "🎲 Random roll call" → the marquee sweeps over whoever hasn't gone yet, slows to a stop, and pops a gold flag. If you'd rather control the pacing, skip spacebar and click a note directly instead — e.g. if the room feels cold, pick whoever wrote the wildest story first
- That person goes on stage and tells both stories out loud (the most fun part of the whole game — don't rush it)
- Space → "Start voting" → 20 seconds. The ticking sound kicks in automatically for the last 10 seconds, no need to announce it
- Space → "Reveal" → a "boom" + confetti burst → let the player tell the full version of their true story
- Space → "Back to story wall" → the player who just went fades out with a ✓, so it's obvious who's left. Repeat.

**Wrap-up**

Once every note has faded, press Space → "🏆 Final leaderboard." Announce Best Liar and Best Detective first (those are more fun than the raw score), then the overall leaderboard, and give first place a small prize.

**A few common pitfalls**

- Test the sound ahead of time. Browsers require a click before audio plays, so if you hit spacebar right at the start, the first sound might be silent
- If the venue's WiFi is unreliable, have everyone switch to cellular data
- The QR code shrinks to the corner once the story wall mode kicks in, so don't rush through the first 4 minutes — let stragglers finish scanning
- Someone shows up late? The story wall stays open the whole time, so they can join whenever and their note will fly onto the wall and be selectable later
- Never say the `?k=` value out loud or display it on screen
- Fallback plan: if the network goes down, the host can read the stories out loud and everyone votes by show of hands — the game doesn't strictly depend on the tech

## 9. Nice-to-haves (none of these are required)

Addition | Why it's worth it | Cost
--- | --- | ---
Live vote-percentage heatmap on the story wall | After the reveal, each note gets a small "67% fooled" marker, which makes the final screen feel more like a story | Small
Round replay | A 15-second flash montage before the leaderboard, quickly cycling through every round's TRUE/FAKE cards | Medium
"Reverse round" | Round two flips to "guess which one is false," so the same group can play twice without it getting stale | Small

Two things deliberately left out (already cut, noting it here so they don't get re-proposed):

- ~~A "change my mind" button~~ — it would slow down the voting pace, and the 20-second tension is core to the game
- ~~Anonymous mode~~ — the whole point of an icebreaker is to get people to remember each other's names; hiding that defeats the purpose

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
