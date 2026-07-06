# ⚔️ Endless Arena

A tiny, grindy, procedural, **infinite 3D auto-battler** for browser & mobile.
Watch your hero fight, loot better gear, unlock class paths and skill trees, push
infinitely stronger enemies — and never, ever get stuck.

**▶ Play: https://danielzaiser91.github.io/endless-arena/**

The full game design lives in [implementation.md](implementation.md).

## The pitch

- **Auto-combat** — your hero fights on their own; you build, equip, and push.
- **No death, no walls** — the player has no HP. Difficulty is only *how fast* you kill.
- **~3 hours of unlocks** — Adventurer → Mage/Warrior/Ranger → sub-paths → masteries…
- **…then infinity** — procedural enemies, endless rarity tiers, exponential grind, forever.
- **Ascension** — reset your run for permanent % bonuses; any wall is breakable by design.
- **Live leaderboard** — real-time top-100 of all players (Firebase), opened on demand.
- **EN/DE**, royalty-free music & SFX, everything animated, runs on your phone.

## Tech

Vite + TypeScript + Three.js, no UI framework. Pure headless core (`src/core/tick()`
shared by live play, offline progress, the headless sim, and tests), all balance numbers
in one constants file, seeded RNG, GitHub Actions → GitHub Pages.

- `npm run dev` — local dev server
- `npm test` — unit + balance-band tests
- `npm run sim -- --until <checkpoint> --profile <active|idle>` — headless balance sim
- `window.dev` in the browser console — manual poke tool (`dev.state()`, `dev.grant(path, value)`,
  `dev.tick(seconds)`, `dev.setArenaLevel(n)`, `dev.fakeUpdate()`)

## Leaderboard honesty note

Scores are client-reported and protected only by basic Firestore rules — this is a toy
leaderboard for a free game, not an anti-cheat fortress. If Firestore/Auth aren't reachable,
the leaderboard panel falls back to showing your local best only; the game itself never
depends on the network.

## Credits

All audio is CC0 / public domain, created by [Kenney](https://kenney.nl) (Kenney's Sound
Pack) — free to use in any project, credit appreciated but not required.

- SFX (hit, crit, enemy death, loot, level-up, class-up, ascension, click, error-nudge):
  Impact Sounds, RPG Audio, and Interface Sounds packs.
- Music loops ("Infinite Descent", "Mission Plausible"): Music Loops pack.
- Ascension fanfare: Music Jingles (Pizzicato) pack.

Full CC0 license text: http://creativecommons.org/publicdomain/zero/1.0/
