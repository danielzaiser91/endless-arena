import { setArenaLevel } from '../core/actions';
import { enemyHp } from '../core/enemies';
import type { GameState } from '../core/state';
import * as C from '../core/constants';
import { t } from '../i18n';

export interface Hud {
  root: HTMLDivElement;
  update: (state: GameState, dps: number) => void;
  setNote: (text: string) => void;
}

export interface HudDeps {
  getState: () => GameState;
  refresh: () => void;
}

export function createHud(container: HTMLElement, deps: HudDeps): Hud {
  const root = document.createElement('div');
  root.id = 'hud';
  root.innerHTML = `
    <div class="hud-stats">
      <span data-k="level"></span>
      <span data-k="dps"></span>
      <span data-k="gold"></span>
      <span data-k="kills"></span>
    </div>
    <div class="hud-arena-row">
      <button data-k="arena-down">−</button>
      <span data-k="arena"></span>
      <button data-k="arena-up">+</button>
      <span data-k="ttk"></span>
    </div>
    <div class="hud-note"></div>
  `;
  container.appendChild(root);

  const els = {
    level: root.querySelector('[data-k="level"]') as HTMLElement,
    dps: root.querySelector('[data-k="dps"]') as HTMLElement,
    gold: root.querySelector('[data-k="gold"]') as HTMLElement,
    kills: root.querySelector('[data-k="kills"]') as HTMLElement,
    arena: root.querySelector('[data-k="arena"]') as HTMLElement,
    ttk: root.querySelector('[data-k="ttk"]') as HTMLElement,
    arenaDown: root.querySelector('[data-k="arena-down"]') as HTMLButtonElement,
    arenaUp: root.querySelector('[data-k="arena-up"]') as HTMLButtonElement,
    note: root.querySelector('.hud-note') as HTMLElement,
  };

  els.arenaDown.addEventListener('click', () => {
    const state = deps.getState();
    setArenaLevel(state, state.arenaLevel - 1);
    deps.refresh();
  });
  els.arenaUp.addEventListener('click', () => {
    const state = deps.getState();
    setArenaLevel(state, state.arenaLevel + 1);
    deps.refresh();
  });

  function update(state: GameState, dps: number): void {
    els.level.textContent = `${t('hud.level')} ${state.level}`;
    els.dps.textContent = `${t('hud.dps')} ${dps.toFixed(1)}`;
    els.gold.textContent = `${t('hud.gold')} ${Math.floor(state.gold)}`;
    els.kills.textContent = `${t('hud.kills')} ${state.lifetimeKills}`;
    els.arena.textContent = `${t('hud.arena')} ${state.arenaLevel}`;
    els.arenaUp.disabled = state.arenaLevel >= state.bestArenaLevel + 1;

    const ttk = dps > 0 ? enemyHp(state.arenaLevel) / dps : Infinity;
    els.ttk.textContent = `${t('hud.ttk')} ${Number.isFinite(ttk) ? ttk.toFixed(1) + 's' : '—'}`;
    els.ttk.classList.toggle('hud-ttk-warn', ttk > C.TTK_WARN_SECONDS);
  }

  function setNote(text: string): void {
    els.note.textContent = text;
  }

  return { root, update, setNote };
}
