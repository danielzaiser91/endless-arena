# Agent Prompt — Build "Endless Arena"

> Copy everything below into a fresh Claude Code session started in this repo's root
> (`C:\code\ai\adventure 3d`) when development should begin.

---

You are building **Endless Arena**, a tiny grindy procedural infinite 3D auto-battler for
browser + mobile. The complete, binding design is in **`implementation.md`** — read it fully
before writing any code. Where this prompt and `implementation.md` disagree, `implementation.md` wins.
`CLAUDE.md` contains the standing project rules; follow them in every session.

## Mission

Implement the game end-to-end, milestone by milestone (implementation.md §17, M1→M9), on this
repo's `main` branch. Every push deploys automatically to GitHub Pages via the existing workflow
(`.github/workflows/deploy.yml`) — when the first playable build exists, replace the placeholder
deployment (`public/` upload) with the Vite build output, keeping the test→build→deploy order.

## Hard Constraints (non-negotiable)

1. **Secrets**: `.secrets/` holds a Firebase **service-account JSON (admin credential)**. It is
   gitignored — it must never be committed, bundled, imported by client code, or printed to logs.
   The client uses only the public Firebase **web-app config**.
2. **Purity**: `src/core/` never imports DOM, Three, or Audio. One `tick()` drives play, offline
   progress, sim, and tests.
3. **Balance**: every tunable number lives in `src/core/constants.ts` and nowhere else.
   Balance changes = edit constants → run sim → check bands (implementation.md §16).
4. **Determinism**: seeded RNG in game state; no `Math.random()` in core.
5. **Never stuck**: all nine guarantees in implementation.md §10 must hold. The sim's no-wall
   metric is a required test, not a suggestion.
6. **Simplicity**: no UI framework, no external 3D models, no extra backend. If a feature isn't
   in implementation.md, don't build it. When in doubt, build the smaller version.
7. **Tests before push**: `npm test` green before every push; CI blocks deploy otherwise.
8. **Assets**: audio must be verifiably CC0/royalty-free; keep a credit list in the README.

## One-Time Setup Tasks (do these as part of M7, leaderboard)

The Firebase project exists: **`adventure-3d-inc`** (project number 1034047468064). Using the
service account in `.secrets/` (via Google REST APIs with an OAuth token from the JSON key — a
small Node script is fine):

1. Ensure a **Firestore database** exists (default database, location `europe-west3`).
2. Ensure **Anonymous Authentication** is enabled (Identity Toolkit `updateConfig`).
3. Ensure a **Web App** is registered (Firebase Management API), fetch its config, and write it
   to `src/net/firebase-config.ts` (this config is public by design — safe to commit).
4. Deploy the **Firestore security rules** from implementation.md §11 (own-doc writes only,
   validation, monotonic `bestLevel`).

If any step fails due to missing API permissions, do not work around it with the admin key in
client code — tell the user the exact Firebase-console click path instead and continue with the
local-fallback leaderboard until it's resolved.

## Working Style

- One milestone per iteration: implement → test → sim (once it exists) → push → verify the Pages
  deploy → briefly report what's playable now.
- Commit messages describe player-visible effect first ("Loot: auto-equip + forge sink"), then detail.
- After M2, keep the game playable at every push — never leave `main` broken.
- Verify balance claims by running the sim, not by reasoning about formulas.
- Mobile is a first-class target: test narrow viewport + touch early, keep the perf budget
  (implementation.md §12).
- UI text: EN/DE via the i18n table from day one — never hardcode strings.

## Definition of Done

- All milestones M1–M9 complete; balance bands and no-wall metric green in sim.
- Live on GitHub Pages: fights, loot, classes (3 decision points in first ~3 h), skill trees,
  forge, Ascension, live Firebase leaderboard, EN/DE toggle, music + SFX, offline progress.
- A stranger can open the URL on a phone and grind happily forever without ever getting stuck.
