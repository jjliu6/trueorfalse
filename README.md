# TRUE or FALSE

An offline hackathon icebreaker game (Lovable + Supabase). 10 people each write one true story and one made-up story; everyone else guesses which one is real.

Two screens only: a big screen for the host (projector) and everyone's phone — no separate admin screen.

## Quick start

**Try the prototype** — open `true-or-false.html` in a browser (no setup required). It's a standalone offline demo with fake data, useful for validating pacing and visuals before touching the real app. Toggle between 🖥 Big screen / 📱 Phone in the top-right corner. Press **F** to simulate a submission, **Space** to advance, or click a sticky note directly.

**Run the real app locally:**

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Requires Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating). Supabase schema and migrations live in [`supabase/migrations`](./supabase/migrations).

## Docs

- [Game design](./docs/game-design.md) — rules, scoring, host controls, the reasoning behind key decisions
- [Architecture](./docs/architecture.md) — why Supabase, schema overview, routes, security model
- [Build prompts](./docs/build-prompts.md) — the four Lovable prompts used to build the app, kept as a design record
- [Event day guide](./docs/event-day-guide.md) — a runbook for hosting the game live
