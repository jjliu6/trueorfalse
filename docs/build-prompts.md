# Build prompts

The app was originally built in Lovable by pasting these prompts one round at a time (four rounds total). Kept here as a record of intent and as a reference for regenerating or extending any of these pieces.

**Why split into rounds?** Doing too much in one shot tends to go off the rails. Scaffold first → wire up the data → add animation last — each round can be verified before moving on, and it's easy to roll back if something breaks. Before the third round, upload screenshots of the prototype (story wall / reveal / leaderboard) and say "match this visual style."

## Round 1 · Scaffold

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
- Top row: logo "TRUE or FALSE" on the left, a pill showing "7 / 10 submitted" next to it, and a small join card on the far right (an ~86px QR code + room code + URL) — a supporting element, don't let it take up much space
- The middle area is the story wall: each person who has submitted is a "sticky note" showing avatar + name + story A + story B
  - Each note has a small semi-transparent strip of "tape" at the top
  - Notes cycle through 5 semi-transparent colors (purple/cyan/pink/yellow/green) — don't make them all gray
  - **Important:** notes should look crooked, not perfectly aligned — randomly rotate each one -4.5°~+4.5° and offset it vertically -14px~+14px, so it looks stuck on by hand
- Column count is computed from the number of players: `cols = min(5, max(2, ceil(count/2)))`, so up to 10 people always fits in two rows and the cards can stay large
- Players who've already gone fade to 26% opacity + 0.9 grayscale, with a green circular ✓ badge in the top-right corner
- Before anyone has submitted, the QR code enlarges to 250px and sits centered, with a line saying "write one true story and one made-up one — a single sentence is enough, save the details for when you tell it live"; once the first person submits, the QR code shrinks into the corner and the story wall expands

**[/screen on-stage page]** current player's avatar + name at the top, two large story cards (labeled A / B) below, an empty status bar reserved at the bottom
**[/screen leaderboard page]** top row: "🏆 Final Leaderboard" title on the left, two special-award cards side by side on the right (😈 Best Liar / 🕵️ Best Detective, each showing avatar + name + one line of description); 10 leaderboard rows below, each row showing [rank][medal][avatar][name][progress bar][score]. The whole page must fit within one 16:9 screen with no scrollbar
**[/play]** five steps: nickname → write two stories → waiting → voting → results
- The two story inputs both use `maxlength=40`, with a live "23/40" counter next to the label that turns yellow at ≥30 and red at 40

## Round 2 · Wire up Supabase + the host control bar

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

## Round 3 · Add animation

Now add animation to the big screen using framer-motion. Reference the screenshots I uploaded.

**Story wall (lobby):**
- New note entrance: starts 80px below its resting position, scaled to 0.62, rotated to 5x its resting angle, then springs back to its own resting angle with easing `cubic-bezier(.16,1.15,.3,1)` over 0.75s
- When multiple notes arrive at once, stagger their entrance by 85ms each
- After landing, each note enters a slow 7-second "breathing" loop: rises 7px, rotation converges to 45% of its resting angle, repeating forever (the breathing keyframes must include the note's own rotation angle, or it'll snap upright)
- The just-submitted note gets an extra cyan ring that expands outward and fades, over 1.3s
- The room code uses a purple → cyan gradient with the gradient position animating continuously
- When the wall is empty, the large QR code pulses a purple glow ring every 3 seconds

**Random roll-call marquee** (the key interaction — nail the "spinning wheel slowing down" feel):
- Start by putting the story wall into a "spinning" state: all notes drop to 28% opacity + 0.6 grayscale
- Use a recursive `setTimeout` to highlight one note at a time (cyan 4px outline + 80px glow + 1.35x brightness) with a short electronic blip sound each time; start at a 55ms interval and multiply it by 1.14 after every step so it gradually slows down; stop once the interval exceeds 300ms, landing on the pre-randomized winner
- When it stops, switch that note to a gold outline + 120px gold glow, pop a small gold flag above it ("🎯 It's you!"), play a "ding," and hold for 0.9s before moving to the on-stage page
- **Important:** implement all of this highlighting with `box-shadow` / `filter` / `opacity`, not `transform` — otherwise it'll fight with the breathing animation over the same property and they'll visually clash

**On stage:** the player's avatar floats up and down on a 3.4s loop; card A slides in from the left with a 24deg Y-axis rotation, card B slides in from the right, 120ms later

**Voting:** a pill-shaped status bar at the bottom — a conic-gradient ring countdown on the left (computed from `voting_ends_at`), everyone's avatar dots in the middle (each jumps from 35% opacity to fully bright once that person votes), and "4 / 9 voted" on the right

**Reveal (the emotional peak — go all out):**
- The fake card: fades, dims, shrinks to 0.94, shakes left-right for 0.5s, and gets stamped with a red FAKE stamp (dropping in from 2.6x scale, tilted -9deg, springy easing)
- The true card: border turns green, glows, scales up to 1.035, gets stamped with a green TRUE stamp
- Full-screen canvas confetti burst (~150 pieces, with gravity and rotation, fading out over 2s)
- Both cards grow a vote-share bar at the bottom, with "5 votes · 56%" in the top-right corner
- A conclusion line at the bottom: if fooled more than half, "😈 XXX fooled 56% of the room — Master Liar, +2 points"; otherwise "🕵️ Only 44% were fooled, 5 people saw through it — +1 point"
- Note: leave a 66px safe margin at the bottom for this text so it doesn't get covered by the host control bar

**Leaderboard:** rows slide in from the left, staggered 90ms each; score bars grow from 0 over 1s; first place gets a full gold gradient row and gold progress bar; the two special-award cards bounce in from below (scale 0.8 → 1, springy easing) delayed 0.35s / 0.55s; fire confetti twice on entry plus an ascending musical scale

Mobile also needs feedback: tapping an option scales it to 0.98, the selected state gets a cyan outline + glow; on reveal, "You got it right" bounces in with an emoji.

## Round 4 · Sound effects

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
