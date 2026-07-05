# ⚔️ Endless Arena

A tiny, grindy, procedural, **infinite 3D auto-battler** for browser & mobile.
Watch your hero fight, loot better gear, unlock class paths and skill trees, push
infinitely stronger enemies — and never, ever get stuck.

**▶ Play: https://danielzaiser91.github.io/endless-arena/**

> 🚧 **Status: design phase.** The full game design lives in
> [implementation.md](implementation.md); development kicks off with
> [AGENT_PROMPT.md](AGENT_PROMPT.md). The live page is a placeholder until then.

## The pitch

- **Auto-combat** — your hero fights on their own; you build, equip, and push.
- **No death, no walls** — the player has no HP. Difficulty is only *how fast* you kill.
- **~3 hours of unlocks** — Adventurer → Mage/Warrior/Ranger → sub-paths → masteries…
- **…then infinity** — procedural enemies, endless rarity tiers, exponential grind, forever.
- **Ascension** — reset your run for permanent % bonuses; any wall is breakable by design.
- **Live leaderboard** — real-time top-100 of all players (Firebase), opened on demand.
- **EN/DE**, royalty-free music & SFX, everything animated, runs on your phone.

## Tech (planned)

Vite + TypeScript + Three.js, no framework. Pure headless core (`tick()` shared by game,
offline progress, sim, and tests), all balance numbers in one constants file, seeded RNG,
GitHub Actions → GitHub Pages.

## Leaderboard honesty note

Scores are client-reported and protected only by basic Firestore rules — this is a toy
leaderboard for a free game, not an anti-cheat fortress.

## Credits

Audio assets (CC0 / royalty-free) will be listed here as they are added.
