import { t } from '../i18n';

/** Minimal HUD overlay for M2 (full stats panel + i18n toggle UI lands in M3). */
export interface Hud {
  root: HTMLDivElement;
  update: (info: HudInfo) => void;
  setNote: (text: string) => void;
}

export interface HudInfo {
  level: number;
  arenaLevel: number;
  kills: number;
  gold: number;
  dps: number;
}

export function createHud(container: HTMLElement): Hud {
  const root = document.createElement('div');
  root.id = 'hud';
  root.innerHTML = `
    <div class="hud-stats">
      <span data-k="level"></span>
      <span data-k="arena"></span>
      <span data-k="dps"></span>
      <span data-k="gold"></span>
      <span data-k="kills"></span>
    </div>
    <div class="hud-note"></div>
  `;
  container.appendChild(root);

  const els = {
    level: root.querySelector('[data-k="level"]') as HTMLElement,
    arena: root.querySelector('[data-k="arena"]') as HTMLElement,
    dps: root.querySelector('[data-k="dps"]') as HTMLElement,
    gold: root.querySelector('[data-k="gold"]') as HTMLElement,
    kills: root.querySelector('[data-k="kills"]') as HTMLElement,
    note: root.querySelector('.hud-note') as HTMLElement,
  };

  function update(info: HudInfo): void {
    els.level.textContent = `${t('hud.level')} ${info.level}`;
    els.arena.textContent = `${t('hud.arena')} ${info.arenaLevel}`;
    els.dps.textContent = `${t('hud.dps')} ${info.dps.toFixed(1)}`;
    els.gold.textContent = `${t('hud.gold')} ${Math.floor(info.gold)}`;
    els.kills.textContent = `${t('hud.kills')} ${info.kills}`;
  }

  function setNote(text: string): void {
    els.note.textContent = text;
  }

  return { root, update, setNote };
}
