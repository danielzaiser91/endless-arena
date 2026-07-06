# Handoff — Endless Arena

Stand: 2026-07-06, 13:56 Uhr. Für die nächste Session: **im Ordner `C:\code\ai\endless-arena` starten**
(nicht in `3d incremental` — das war das Anzeige-Problem in dieser Session: Session-Root war
versehentlich Stardust, Endless-Arena-Arbeit lief per `cd` daneben. Code landete korrekt im
richtigen Repo, aber Client-UI zeigte den falschen Branch an).

## Wo wir stehen

- **M0 + M1 fertig, live auf Pages.** Repo: [danielzaiser91/endless-arena](https://github.com/danielzaiser91/endless-arena) · Live: https://danielzaiser91.github.io/endless-arena/
- Ordner wurde umbenannt: `adventure 3d` → `endless-arena` (git/Remote/Tests danach verifiziert, funktioniert).
- Design: [implementation.md](implementation.md) (bindend, mit §16 Versionierung + §17 Balance-Tooling).
- Startprompt für Vollimplementierung: [AGENT_PROMPT.md](AGENT_PROMPT.md).

## Was existiert

- **M0**: Vite+TS+Vitest-Scaffold, echte CI (`test → build → deploy`), Update-Banner 1:1 von
  Stardust portiert (`src/ui/updateBanner.ts`, `version.json`-Polling, SW-Cache-Bust).
- **M1**: purer Core (`src/core/`: state, tick, formulas, enemies, loot, classes, skills, actions,
  save), Sim-CLI (`npm run sim -- --until <checkpoint> --profile <active|idle>`), Autoplay-Treiber
  (`src/sim/autoplay.ts`, von Sim-CLI **und** `tests/balance.test.ts` genutzt). 27 Tests grün.

## Balance-Learnings (nicht wieder vergessen, kostet sonst wieder Stunden)

1. `ENEMY_XP_GROWTH` muss ≈ `ENEMY_HP_GROWTH` sein — sonst lohnt sich Arena-Level pushen nicht
   fürs Character-Leveling (Idle schlägt Active, weil Active zu aggressiv pusht).
2. `BOSS_HP_MULT` muss **strikt kleiner** als `ENEMY_HP_GROWTH` bleiben — sonst hat das Level
   direkt nach einem Boss weniger effektive HP als der Boss selbst (Monotonie-Bruch, per Test gefangen).
3. Ascension-Trigger im Autoplay ist **dauer-basiert** (Frontier X Sekunden nicht gepusht), nicht
   TTK-Schwellwert-basiert — ein reiner TTK-Check feuert nie, weil das Push-Verhalten selbst TTK
   schon niedrig hält.
4. Echoes müssen im Autoplay aktiv ausgegeben werden (`A.spendEcho`) — sonst bringt Ascension
   mechanisch gar nichts (war ein echter Bug, der Wiederholungs-Ascensions wirkungslos machte).
5. Bänder in implementation.md §17 sind nach echten Sim-Daten leicht angepasst (nicht die
   ursprünglichen Schätzwerte) — bei künftigen Constants-Änderungen `npm run sim` + `npm test`
   als Wahrheit nehmen, nicht die Doku.

## Nächster Schritt

**M2 — Minimal-Render** (implementation.md §18): Three.js-Arena, Hero/Enemy-Meshes aus Primitives,
Angriffs-/Death-Animationen. Danach M3 (UI-Shell + i18n-Panels), M4 (Equipment/Forge/Auto-Equip), …

## Offene Punkte / Entscheidungen, die stehen

- Firebase-Setup (M7) läuft **automatisch per Skript** mit dem Admin-Key aus `.secrets/`, ohne
  vorherige Rückfrage — schon mit dem User geklärt.
- `.secrets/adventure-3d-inc-firebase-adminsdk-fbsvc-2639c082ff.json` ist Admin-Credential,
  gitignored, niemals in Client-Code.
