# Endless Arena — Implementation Plan

A tiny, grindy, procedural, **infinite 3D auto-battler** for browser + mobile.
You watch your hero fight, loot rains down, numbers go up — forever.

Live: https://danielzaiser91.github.io/endless-arena/
Repo: https://github.com/danielzaiser91/endless-arena

---

## 1. Vision & Design Pillars

One hero, one arena, endless enemies. Combat is fully automatic; the player's job is
choosing *where* to fight, *what* to equip, and *how* to build their character.

1. **Tiny & simple** — one screen, one hero, one enemy at a time. No inventory Tetris, no quest log.
2. **You always win** — the player has **no HP** and cannot die. Difficulty = *how fast* you kill, never *whether*.
3. **No walls, ever** — every system below is designed so the player can never get stuck (see §10).
4. **Number-go-up forever** — after ~3h of structured unlocks, the game becomes an infinite procedural loop.
5. **Juicy** — every action (hit, crit, loot, level-up, class-up, ascension) has a 3D animation and a sound.

## 2. Core Loop

```
fight (auto) → loot drops → auto-equip better gear → XP → level up
   → spend attribute + skill points → class milestone? (first 3h only)
   → push to higher arena level → kills feel slow? → farm lower / Ascend
   → permanent % bonus → come back stronger → repeat forever
```

Session shape: check in, watch fights, spend points, push a few arena levels, leave.
Works as an active game (clicking upgrades) and as an idle game (auto-equip + offline progress).

## 3. Combat Model

- **Auto-combat only.** Hero and enemy stand in the arena; the hero attacks on a timer, the enemy plays attack animations back (cosmetic only — flinch/knockback visuals, no player damage).
- Enemy = an HP bag with a level. **Time-to-kill (TTK) is the only difficulty.**
- Player DPS = `basePower × gearPower × skillMults × echoMults × critFactor × attacksPerSecond`.
- **Arena level is chosen by the player** — any level from 1 up to `highestCleared + 1`. Grinding low levels is always allowed and always productive (loot scales with the level being farmed).
- **Boss every 10th level**: 5× HP, guaranteed higher-rarity drop, unique silhouette + tint.
- Crits and skill procs (fireball every Nth hit, chain lightning, multi-shot …) exist purely for damage variance and visual juice.
- Soft guidance, never punishment: if the current TTK exceeds ~30 s, the UI suggests a lower level (or Ascension once unlocked). Nothing is ever forced.

## 4. Attributes

Four attributes; every level grants **3 attribute points**. Respec is free and instant.

| Attribute | Effect |
|---|---|
| **Power** | +damage per hit |
| **Speed** | +attacks per second |
| **Fortune** | +loot rarity & +gold |
| **Wisdom** | +XP gain |

No defense/HP attributes — the player can't be hurt, so every point is offense or economy.

## 5. Class Paths (the first ~3 hours)

Everyone starts as **Adventurer**. Exactly **three choices**, then the infinite loop begins.
Classes change the weapon + attack visuals, unlock the path's skill tree, and grant a signature passive.

| Milestone | Target time (active play) | Unlock |
|---|---|---|
| Level 1 | 0 min | **Adventurer** (simple sword pokes) |
| Level 10 | ~20–30 min | **Choose a path:** Mage (magic) / Warrior (melee) / Ranger (bow) |
| Level 25 | ~60–90 min | **Sub-path** (2 options per path) |
| Level 50 | ~2.5–3 h | **Mastery** (2 options per sub-path) + **Ascension unlocks** |
| Level 50+ | forever | Infinite loop: grind, push, ascend. No further class decisions. |

| Path | Sub-paths (L25) | Masteries (L50) |
|---|---|---|
| **Mage** (staff, projectile orbs) | Pyromancer (burn DoT) / Stormcaller (chain lightning) | Inferno Lord / Sun Priest · Tempest / Storm Herald |
| **Warrior** (sword, melee swings) | Berserker (frenzy stacks) / Guardian (heavy crits) | Warlord / Blood Reaver · Sentinel / Colossus |
| **Ranger** (bow, arrows) | Sniper (huge crits) / Windrunner (attack speed) | Deadeye / Hawk Lord · Gale Dancer / Tempest Archer |

Masteries are cheap content: same skill tree, plus **one capstone passive** and a colored aura —
12 names + 12 passives + 12 tints, no new mechanics. Class choices are permanent within a run;
Ascension does **not** reset class (grind, not re-decisions).

## 6. Skill Trees

- One small tree per path (**~18 nodes**), shared by its sub-paths; masteries add the capstone node.
- **1 skill point per level.** Nodes: flat % boosts, proc effects (e.g. "every 5th hit: fireball"), crit chance/damage, multistrike, gold/loot bonuses.
- Final node of every tree is an **infinite dump node** ("+2% damage per point, unlimited") so points are never wasted after the tree is filled.
- Respec is free — builds are toys, not traps.

## 7. Equipment (the actual goal)

- **7 slots**: weapon, helmet, chest, gloves, boots, ring, amulet.
- Drops are procedural: `itemLevel ≈ arena level being farmed`, rarity roll weighted by Fortune.
- **Rarity ladder**: Common → Uncommon → Rare → Epic → Legendary → Mythic, then infinite
  **Ascended +N** tiers (procedural — the ladder never ends).
- Rarity = number of affixes (1–5) + a power multiplier. Affix pool: +Power%, +Speed%, +Fortune%, +Wisdom%, +crit chance, +crit damage.
- Every item compresses to a single **Item Score** → **auto-equip** (toggle, default ON) always picks the best. Manual compare popup for players who care.
- Old items auto-salvage into **gold**. Gold sink: **the Forge** — upgrade each equipped slot (+% Item Score per forge level, exponential cost). Simple, infinite, grindy.

## 8. Enemies (procedural, infinite)

- Level 1 → ∞. HP grows exponentially (start ~`10 × 1.16^level`, tune via sim).
- Procedural names: `[prefix] [creature] [suffix]` — "Rabid Cave Imp of Embers". Localized parts (EN/DE).
- Visuals from a small kit: ~6 primitive-based body shapes × palette; every 10 levels the arena biome tint rotates (meadow → cave → lava → void → …, cycling with variations forever).
- Rewards per kill: XP, gold, drop chance — all functions of enemy level only (defined in `constants.ts`).

## 9. Ascension (meta progression — the anti-wall)

- **Unlocks once Mastery is chosen** (character-level milestone track, ~L50) — a one-time structural
  gate, decoupled from the infinite grind axis below.
- **Reset**: level → 1, gear + gold + skill/attribute points → gone. **Kept**: class/sub-path/mastery, best-level stats, settings.
- **Gain**: `Echoes = floor((bestArenaLevelThisRun − 40) / 5)`, floored at 0 (tune via sim) — scales
  with how far you *pushed the arena*, not your character level, so the reward always reflects the
  actual grind.
- **Spend**: each Echo = **permanent +2% to one attribute** of your choice (Power/Speed/Fortune/Wisdom). Stacks additively without limit, applies from level 1.
- Since Echo bonuses grow without bound and enemy HP is a fixed curve, **any wall is breakable by ascending** — this is the mathematical no-stuck guarantee.
- Ascension has the biggest ceremony in the game: supernova-style 3D burst + unique sound.

## 10. Never-Stuck Guarantees (checklist)

1. No player HP → no death, no fail state.
2. Free arena-level selection → farming easier levels is always available and always productive.
3. Loot scales with farmed level → gear progress even without pushing.
4. Infinite skill dump node → level-ups never stop mattering.
5. Forge gold sink → every kill contributes permanent power.
6. Ascension → unbounded permanent % growth beats any exponential wall.
7. Free respec → no broken builds.
8. Offline progress → time away is never wasted.
9. UI nudges (not forces) toward the fix when TTK gets long.

## 11. Leaderboard (Firebase, live)

- **Score = highest arena level ever cleared** (lifetime, survives Ascension). Tiebreak: total kills.
- **Firebase project**: `adventure-3d-inc` (already created). Firestore + Anonymous Auth.
- Doc per player: `players/{uid}` → `{ name (≤16 chars), bestLevel, kills, ascensions, classId, updatedAt }`.
- Player picks a nickname on first leaderboard open; anonymous auth UID keys the doc.
- **Live**: while the leaderboard panel is open, `onSnapshot` on `orderBy(bestLevel, desc), limit(100)` — real-time updates, unsubscribed on close (keeps free-tier reads low).
- Security rules: writes only to own doc, type/length validation, `bestLevel` may only increase.
- **Anti-cheat: none beyond rules.** Scores are client-reported; this is a toy leaderboard for a free game — documented honestly in the README.
- **Offline/blocked fallback**: game runs fully without Firebase; leaderboard shows local best + a hint.
- ⚠️ The **service-account JSON in `.secrets/` is an admin credential — never committed, never shipped to the client.** The client uses only the public web-app config (`apiKey`, `projectId`, …), which is safe to publish by design.

## 12. Presentation (3D)

- **Three.js**, one fixed arena: floating circular platform, skybox gradient, slow orbiting camera.
- Characters built from **primitives** (capsule + boxes + cones — no external model pipeline). Weapon mesh per path; aura color per mastery.
- Animations are **procedural tweens** (no skeletal rigs): wind-up → strike → hit-flash on enemy → knockback. Projectiles (orbs/arrows) fly, melee lunges.
- Effect list: hit spark, crit burst (bigger + screen-shake-lite), enemy death dissolve (particles), loot beam + rarity-colored drop, level-up ring shockwave, class-up ceremony (pillar of light), Ascension supernova.
- Post: bloom only (threshold ≥ 0.6 — additive particles overdrive it fast). Optional off-toggle for weak devices.
- Perf budget: 60 fps on a mid-range phone, < 5k triangles, < 50 draw calls, no per-frame allocations in the render loop.

## 13. Audio

- All assets **CC0 / royalty-free** (Kenney audio packs, OpenGameArt CC0, Pixabay). Verify license per file; credit list in README.
- 1–2 looping adventure/battle music tracks (crossfade on Ascension).
- SFX: hit, crit, enemy death, loot drop (per rarity pitch-up), level-up, class-up, ascension, button click, error-nudge.
- WebAudio with a tiny mixer: master / music / SFX sliders + mute, persisted. Audio starts only after first user gesture (browser policy).

## 14. i18n (EN/DE toggle)

- All UI strings via a `strings.ts` table: `t('key')` → `{ en, de }`. No hardcoded text in components.
- Procedural enemy-name parts localized too.
- Default English, toggle in settings, persisted in save.

## 15. Tech & Architecture

- **Vite + TypeScript + Three.js**, no UI framework (plain DOM for panels — the game is one screen).
- `src/core/` is **pure**: no DOM/Three/Audio imports. The same `tick()` drives live play, offline progress, headless sim, and tests.
- **Every balance number lives in `src/core/constants.ts`** — nowhere else.
- Seeded RNG in game state (no `Math.random()` in core) → deterministic sims.
- Mutations only via `src/core/actions.ts`; render/UI read state only.
- Save: versioned JSON in localStorage, autosave every 10 s + on unload, export/import string. New fields default in `initialState()`; semantic changes need a migration + version bump.
- Offline progress: on load, run the same `tick()` in bulk for `min(elapsed, 8h)` at the last selected arena level, then show a "while you were away" summary.

```
src/
  core/        state, tick, actions, constants, rng, save, i18n-data
  render/      three scene, hero/enemy builders, tweens, effects
  ui/          panels (stats, skills, forge, leaderboard, settings), i18n
  audio/       mixer, sfx map
  net/         firebase init, leaderboard sync (isolated — game runs without it)
sim/           headless CLI runner (profiles: active / idle)
tests/         vitest: unit + balance bands
public/        static assets (audio, icons)
```

## 16. Versioning & Update Banner

Ported 1:1 from the sibling project *Stardust to Singularity*, where this exact mechanism is
already proven in production. Two **separate** version concepts:

- **`SAVE_VERSION`** (in `constants.ts`) — schema version of the save data. Bump only on
  semantic save changes; `save.ts` migrates old saves forward. New fields alone don't need a bump
  (they just default in `initialState()`).
- **`__APP_VERSION__`** (build-time constant) — identifies *this deploy*, unrelated to save schema.
  Drives the live update-banner.

**Mechanism:**

1. `vite.config.ts` defines `__APP_VERSION__ = "${package.json version}+${BUILD_VERSION}"`, where
   `BUILD_VERSION` is an env var the CI workflow sets to the short commit SHA (`dev` locally).
2. CI, after `vite build`, stamps `dist/sw.js` (replaces a `__BUILD__` placeholder with the SHA,
   forcing a fresh service-worker cache name per deploy) and writes `dist/version.json` with the
   same version string.
3. Client (`src/ui/updateBanner.ts`): ~60 s after load, then every ~3 min, fetches
   `version.json?_=<timestamp>` with `cache: 'no-store'`. If the fetched version differs from the
   compiled-in `__APP_VERSION__`, show a persistent top banner (EN/DE via i18n, pulsing border).
4. Click on the banner → save the game, `unregister()` all service workers, delete all Cache
   Storage entries, then `location.href = pathname + '?v=' + Date.now()` (belt-and-braces cache bust).
5. The service worker is cache-first for static assets but **always** lets `version.json` (and any
   streamed audio) hit the network, so the check itself is never stale.
6. No-op in dev (`import.meta.env.DEV` → version is always `"dev"`, polling would be meaningless).
7. A dev-console hook (`dev.fakeUpdate()`) shows the banner on demand for manual testing without
   waiting for a real deploy.

This is infrastructure, not gameplay — it ships in **M0**, before any game logic exists, exactly
like the placeholder Pages deploy already live today.

## 17. Verification & Balance Testing Tooling

- `npm test` — unit tests + fast balance bands (must be green before every push; CI blocks deploy).
- **Sim CLI**: `npm run sim -- --until <checkpoint> --profile <active|idle> [--maxHours N] [--seed N]`.
  Runs the headless `tick()` in bulk and prints a one-line stat snapshot at the checkpoint (and
  every 10 arena levels along the way): `level, arenaLevel, itemScore, DPS, TTKatCurrentLevel, gold, echoes, wallClockHours`.
  This is how balance gets *inspected*, not just pass/failed — the printed curve is what you read
  to decide which constant to nudge.
- **Checkpoints** (named, so any stage is reachable directly without replaying from zero):
  `adventurer` (L1) · `path_choice` (L10) · `subpath` (L25) · `mastery` (L50) · `first_ascension` ·
  `level100` · `level250` · `level1000` (long-tail infinite-loop sanity check).
- **Dev console** (browser, `window.dev`, non-DEV-stripped): `dev.state()`, `dev.grant(path, value)`,
  `dev.tick(seconds)`, `dev.setArenaLevel(n)`, `dev.fakeUpdate()` — mirrors the console already
  shipped in Stardust to Singularity, so every stage of the live game is manually pokeable too.
- `tests/balance.test.ts` encodes the bands below as fast assertions (small `--maxHours`, checked
  every push); `npm run sim -- --profile active --hours 5` is the full manual progression check.

| Checkpoint | Active profile | Idle profile |
|---|---|---|
| Level 10 (path choice) | 15–30 min | ≤ 60 min |
| Level 25 (sub-path) | 45–90 min | ≤ 3 h |
| Level 50 (mastery) | 2.5–3.2 h | ≤ 8 h |
| First Ascension | 2.8–4 h | ≤ 14 h |

Bands were widened slightly from the original estimate once real sim data existed (implementation.md
is a living plan — "tune via sim" means the numbers here follow the sim, not the other way round).

- **No-wall metric** (sim-enforced): in the first 5 h, no stretch > 20 min without *some* upgrade event (level, better item, skill point, forge level, or Echo).
- **Long-tail sanity** (`level100`/`level250`/`level1000` checkpoints, run with a generous `--maxHours`):
  this is a **stability**, not a pace, check — confirms the infinite loop never divides-by-zero,
  never produces NaN/negative TTK, and that Ascensions monotonically accumulate Echoes and
  eventually lift `lifetimeBestArenaLevel` past any plateau, however slowly. A 100-simulated-hour
  active-profile run is the reference check (`tests/balance.test.ts`); reaching a specific arena
  level within a fixed wall-clock budget is *not* asserted here — only that the plateau breaks.

## 18. Build Milestones

| # | Milestone | Proof |
|---|---|---|
| M0 | Repo scaffold: Vite+TS+Vitest, CI (test→build→deploy), i18n skeleton, version-buster infra (§16) | placeholder still deploys green |
| M1 | Core sim: state, tick, combat, XP, loot, enemies | tests + sim run headless |
| M2 | Minimal render: arena, hero, enemy, attack/death anims | playable in browser |
| M3 | UI shell + i18n: stats panel, arena-level picker, settings | EN/DE toggle works |
| M4 | Equipment + Forge + auto-equip | loot loop feels good |
| M5 | Classes + skill trees + milestone ceremonies | 3 decisions reachable |
| M6 | Ascension + Echoes | wall-break proven in sim |
| M7 | Firebase leaderboard (live top-100) | two browsers see each other |
| M8 | Audio + polish pass (all juice effects) | everything animated + sounds |
| M9 | Balance sim runs vs. §17 bands; mobile perf check | bands green, 60 fps phone |

Deploy is continuous: every push to `main` → GitHub Actions → Pages.

## 19. Non-Goals (keep it tiny)

No PvP, no accounts/passwords, no server code beyond Firestore rules, no external 3D model
pipeline, no shop/monetization, no quests/story, no multiple heroes, no pets/minions (visual
procs only), no serious anti-cheat.
