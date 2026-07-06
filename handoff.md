# Handoff — Endless Arena

Stand: 2026-07-06, 14:15 Uhr. Ordner: `C:\code\ai\endless-arena` (kein `cd`-Versehen mehr).

## Wo wir stehen

- **M0 + M1 + M2 fertig.** Repo: [danielzaiser91/endless-arena](https://github.com/danielzaiser91/endless-arena) · Live: https://danielzaiser91.github.io/endless-arena/
- Design: [implementation.md](implementation.md) (bindend) · Startprompt: [AGENT_PROMPT.md](AGENT_PROMPT.md).

## Was existiert

- **M0**: Vite+TS+Vitest-Scaffold, CI (`test → build → deploy`), Update-Banner.
- **M1**: purer Core (`src/core/`), Sim-CLI, Autoplay-Treiber. 27 Tests grün.
- **M2**: Minimal-Render (`src/render/`): Three.js-Arena (Plattform, Ring, Gradient-Sky, orbitierende
  Kamera), Held + Gegner aus Primitives (`actors.ts`), prozedurale Tweens für Angriffs-Swing,
  Hit-Flash/Knockback und Death-Dissolve (`effects.ts`, `game.ts`). `GameView` (`src/render/game.ts`)
  verbindet Core-`tick()` mit RAF-Loop, Autosave (10s + beforeunload + visibilitychange), Offline-Progress
  (bulk-tick in 30s-Chunks, gecappt 8h) und einem minimalen HUD (`src/ui/hud.ts`: Level, Arena, DPS,
  Gold, Kills + Willkommens-Notiz). `main.ts` mountet das direkt, kein Landing-Screen mehr.

## Learnings aus M2

1. `beforeunload` löst `save()` aus — beim manuellen Testen von Offline-Progress via
   „`savedAt` in der Vergangenheit + `location.reload()`" überschreibt der `beforeunload`-Handler
   `savedAt` mit „jetzt", **bevor** die neue Seite lädt. Kein Bug, aber beim Testen im Hinterkopf
   behalten (im Browser lässt sich Offline-Progress so nicht faken; nur echtes Schließen/Wiederöffnen
   nach Zeitablauf testet es ehrlich).
2. Three.js `CapsuleGeometry` (r147+) reicht für alle Charakter-Körper — keine externen Modelle nötig,
   wie in implementation.md §12 gefordert.
3. HP-Bar über dem Gegner braucht eine eigene Billboard-`Group`, sonst dreht sie mit der Kamera-Orbit
   falsch (nicht am Mesh direkt anhängen).
4. `app.title`/`app.tagline`/`app.status` i18n-Keys waren nur vom alten Platzhalter-Screen genutzt —
   beim Rauswerfen des Landing-Screens mit-entfernt (keine toten Strings).

## Balance-Learnings (weiterhin gültig, M1)

1. `ENEMY_XP_GROWTH` ≈ `ENEMY_HP_GROWTH`, sonst lohnt Arena-Pushen nicht fürs Leveln.
2. `BOSS_HP_MULT` < `ENEMY_HP_GROWTH` (Monotonie).
3. Ascension-Trigger im Autoplay ist dauer-, nicht TTK-basiert.
4. Echoes müssen im Autoplay aktiv ausgegeben werden (`A.spendEcho`).
5. §17-Bänder sind nach Sim-Daten justiert — bei Constants-Änderungen `npm run sim` + `npm test` als
   Wahrheit nehmen, nicht die Doku.

## Nächster Schritt

**M3 — UI-Shell + i18n** (implementation.md §18): Stats-Panel, Arena-Level-Picker, Settings-Panel
(Sprache, Auto-Equip-Toggle, Audio-Mixer-Platzhalter). Das jetzige Mini-HUD aus M2 bleibt Grundlage,
wird aber um echte Panels erweitert (kein Vollbild-Overlay-Chaos — implementation.md §15: „ein Screen").

## Offene Punkte / Entscheidungen, die stehen

- Firebase-Setup (M7) läuft automatisch per Skript mit dem Admin-Key aus `.secrets/`, ohne
  vorherige Rückfrage — schon mit dem User geklärt.
- `.secrets/adventure-3d-inc-firebase-adminsdk-fbsvc-2639c082ff.json` ist Admin-Credential,
  gitignored, niemals in Client-Code.
