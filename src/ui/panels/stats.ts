import { spendAttributePoint, respecAttributes } from '../../core/actions';
import { xpForLevel } from '../../core/formulas';
import type { AttrKey, GameState } from '../../core/state';
import { t, type Key } from '../../i18n';
import type { Panel, PanelDeps } from './types';

const ATTRS: AttrKey[] = ['power', 'speed', 'fortune', 'wisdom'];
const ATTR_LABEL_KEYS: Record<AttrKey, Key> = {
  power: 'attr.power',
  speed: 'attr.speed',
  fortune: 'attr.fortune',
  wisdom: 'attr.wisdom',
};

export function createStatsPanel(deps: PanelDeps): Panel {
  const root = document.createElement('div');
  root.className = 'panel panel-stats';

  const xpRow = document.createElement('div');
  xpRow.className = 'stats-xp-row';
  root.appendChild(xpRow);

  const pointsRow = document.createElement('div');
  pointsRow.className = 'stats-points-row';
  root.appendChild(pointsRow);

  const attrRows: Record<AttrKey, { value: HTMLElement; btn: HTMLButtonElement }> = {} as never;
  const grid = document.createElement('div');
  grid.className = 'stats-grid';
  for (const key of ATTRS) {
    const row = document.createElement('div');
    row.className = 'stats-row';
    const label = document.createElement('span');
    label.className = 'stats-label';
    label.textContent = t(ATTR_LABEL_KEYS[key]);
    const value = document.createElement('span');
    value.className = 'stats-value';
    const btn = document.createElement('button');
    btn.textContent = '+';
    btn.addEventListener('click', () => {
      if (spendAttributePoint(deps.getState(), key)) deps.refresh();
    });
    row.append(label, value, btn);
    grid.appendChild(row);
    attrRows[key] = { value, btn };
  }
  root.appendChild(grid);

  const respecBtn = document.createElement('button');
  respecBtn.className = 'stats-respec';
  respecBtn.textContent = t('stats.respec');
  respecBtn.addEventListener('click', () => {
    respecAttributes(deps.getState());
    deps.refresh();
  });
  root.appendChild(respecBtn);

  function update(state: GameState): void {
    const xpNeeded = xpForLevel(state.level);
    xpRow.textContent = `${t('stats.level')} ${state.level} — ${Math.floor(state.xp)} / ${Math.floor(xpNeeded)} XP`;
    pointsRow.textContent = `${t('stats.points')}: ${state.attributePoints}`;
    for (const key of ATTRS) {
      attrRows[key].value.textContent = String(state.attributes[key]);
      attrRows[key].btn.disabled = state.attributePoints <= 0;
    }
  }

  return { root, update };
}
