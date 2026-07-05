# Endless Arena — Projektregeln

Tiny grindy procedural infinite 3D auto-battler (Browser/Mobile).
Live: https://danielzaiser91.github.io/endless-arena/
Design (bindend): [implementation.md](implementation.md) · Agent-Startprompt: [AGENT_PROMPT.md](AGENT_PROMPT.md)

**Status: Design-Phase — noch kein Spielcode.** Entwicklung startet erst mit AGENT_PROMPT.md.

## Invarianten

- `.secrets/` enthält den Firebase-Service-Account-Key (Admin-Credential, Projekt `adventure-3d-inc`):
  **niemals committen, niemals in Client-Code, niemals loggen.** Client nutzt nur die öffentliche Web-App-Config.
- `src/core/` ist **pur**: kein DOM-, Three- oder Audio-Import. Ein `tick()` für Spiel, Offline-Progress, Sim und Tests.
- **Alle Balance-Zahlen** ausschließlich in `src/core/constants.ts`; Änderung = Konstante anfassen → Sim laufen lassen.
- RNG seedbar im GameState — kein `Math.random()` im Core.
- Mutationen nur über `src/core/actions.ts`; Render/UI lesen den State nur.
- Save versioniert (localStorage); neue Felder via `initialState()`-Default, semantische Änderungen = Migration + Versions-Bump.
- UI-Strings nur über die i18n-Tabelle (EN/DE) — nie hardcoden.
- Die 9 "Never-Stuck"-Garantien (implementation.md §10) sind unantastbar.

## Workflows

- `npm test` muss vor jedem Push grün sein; CI (Test → Build → Pages) blockt sonst den Deploy.
- Deploy: Push auf `main` → GitHub Actions → Pages. Kein manueller Deploy.
- Balance-Zielbänder + No-Wall-Metrik: implementation.md §16, geprüft via `npm run sim`.
