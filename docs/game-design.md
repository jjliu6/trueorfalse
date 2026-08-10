# Game design

## How it's played

10 people each write one true story and one made-up story (two short stories total). Everyone else guesses which one is real.

There are only two screens: the big screen in front of the host (projector), and everyone's phone. There is no third "admin" screen.

Stage | Big screen (host's laptop → projector) | Phone (all participants)
--- | --- | ---
① Story wall (lobby) | Every submission flies a crooked sticky note onto the wall with an avatar, name, and both stories. The QR code shrinks into the top-right corner | Enter a nickname → write two stories (40 characters each) → mark which one is true → submit
② Roll call | Random roll call (a marquee sweeps over everyone who hasn't gone yet) or the host taps a sticky note directly | "XXX is up"
③ On stage | The current player's avatar rises up; two large cards (A/B) slide in from left and right | "XXX is telling their stories, listen up"
④ Voting | A 20s ring countdown with ticking sound. Only the vote count is shown, never the distribution | Two big buttons, A / B
⑤ Reveal | The fake gets stamped FAKE in red and fades; the real one glows green with a TRUE stamp and confetti | "You guessed right / You got fooled" + this round's score
⑥ Back to wall | Players who've gone fade out on the wall with a green ✓ | "Waiting for the next player"
⑦ Leaderboard | Two special awards (Best Liar / Best Detective) + a growing bar-chart leaderboard | Your own rank

The game loops: story wall → roll call → tell stories → vote → reveal → back to story wall, until every sticky note has faded, then it moves to the final leaderboard.

### Scoring and the two special awards

- Guessing one person correctly → +1 point
- If your fake story fools **more than half** of the room → +2 points ("Master Liar")
- 🏆 Best Liar = the person with the highest fooled percentage (only one per game)
- 🏆 Best Detective = the person with the most correct guesses

The "+2 for fooling more than half" rule gives storytellers a reason to put effort in. The two awards mean different personality types each get a moment — the good storytellers and the good readers of people.

### Design decisions

- **40-character cap per story** — forces a hook instead of an essay. Forms fill out fast, the wall stays tidy, and the real detail is saved for telling it live on stage.
- **Vote distribution hidden while voting is open** — the moment people see "7 people picked A," everyone piles on. Showing only "7/9 voted" nudges people to vote without leaking information.
- **Sound effects** — a ticking sound for the last 10 seconds of the countdown and a low "boom" at reveal pull everyone's attention back to the screen automatically, so the host never has to shout.

**Pacing** (~25 minutes for 10 people): 4 min to fill out the form → ~2 min per player (5s roll call / 60s telling the story / 20s voting / 40s reveal reactions) → 2 min for the leaderboard.

## Host controls

The big screen runs on the host's laptop, so the control button lives directly on that screen — no separate admin page.

- Fully hidden by default; moving the mouse slides a control bar up from the bottom-right, auto-hiding after 3.5s of inactivity (like a video player).
- One main button, **"Next,"** whose label changes to the next action for the current stage:

```
Story wall ──🎲 Random roll call──▶ On stage ──🗳 Start 20s voting──▶ Voting ──✨ Reveal──▶ Reveal
   ▲                                                                                │
   └──────────────── ← Back to story wall to pick someone ─────────────────────────┘
                                                (Everyone's gone → 🏆 Final leaderboard)
```

- Roll call has two modes: press "🎲 Random roll call" and let the marquee spin to a stop, or click a sticky note directly to control pacing.
- Spacebar = Next (on the story-wall stage, it triggers random roll call). Left arrow = back a step.
- Four smaller buttons: Back / Jump to leaderboard / 🔊 Sound toggle / Reset.

A phone-based remote control was deliberately skipped — it's overkill for an in-person projector setup where the host is already next to the laptop. If a host needs to walk around, a `/remote/:code` page could reuse the same control-bar logic.

## Nice-to-haves (none required)

Addition | Why it's worth it | Cost
--- | --- | ---
Live vote-percentage heatmap on the story wall | After reveal, each note gets a "67% fooled" marker | Small
Round replay | A 15s flash montage before the leaderboard, cycling through every round's TRUE/FAKE cards | Medium
"Reverse round" | Round two flips to "guess which one is false," so the group can play twice | Small

Deliberately cut (noting so they don't get re-proposed):

- ~~A "change my mind" button~~ — slows down voting pace; the 20-second tension is core to the game
- ~~Anonymous mode~~ — the point of an icebreaker is to get people to remember names; hiding that defeats the purpose
