import { ascend, canAscend, echoGainOnAscend, spendEcho } from '../../core/actions';
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

export function createAscensionPanel(deps: PanelDeps): Panel {
  const root = document.createElement('div');
  root.className = 'panel panel-ascension';

  const summary = document.createElement('div');
  summary.className = 'ascension-summary';
  root.appendChild(summary);

  const ascendBtn = document.createElement('button');
  ascendBtn.className = 'ascension-btn';
  ascendBtn.textContent = t('ascension.button');
  ascendBtn.addEventListener('click', () => {
    if (!confirm(t('ascension.confirm'))) return;
    if (ascend(deps.getState())) {
      deps.fx.ascend();
      deps.refresh();
    }
  });
  root.appendChild(ascendBtn);

  const lockedNote = document.createElement('div');
  lockedNote.className = 'ascension-locked';
  lockedNote.textContent = t('ascension.locked');
  root.appendChild(lockedNote);

  const spendGrid = document.createElement('div');
  spendGrid.className = 'ascension-spend-grid';
  root.appendChild(spendGrid);

  const spendRows: Record<AttrKey, { value: HTMLElement; btn: HTMLButtonElement }> = {} as never;
  for (const key of ATTRS) {
    const row = document.createElement('div');
    row.className = 'ascension-spend-row';
    const label = document.createElement('span');
    label.textContent = t(ATTR_LABEL_KEYS[key]);
    const value = document.createElement('span');
    const btn = document.createElement('button');
    btn.textContent = t('ascension.spend');
    btn.addEventListener('click', () => {
      if (spendEcho(deps.getState(), key)) deps.refresh();
    });
    row.append(label, value, btn);
    spendGrid.appendChild(row);
    spendRows[key] = { value, btn };
  }

  function update(state: GameState): void {
    const canGo = canAscend(state);
    const gain = echoGainOnAscend(state);
    summary.textContent = `${t('ascension.echoes')}: ${state.echoes} — ${t('ascension.gainOnAscend')}: +${gain}`;
    ascendBtn.disabled = !canGo;
    ascendBtn.style.display = canGo ? '' : 'none';
    lockedNote.style.display = canGo ? 'none' : '';
    for (const key of ATTRS) {
      spendRows[key].value.textContent = String(state.echoInvested[key]);
      spendRows[key].btn.disabled = state.echoes <= 0;
    }
  }

  return { root, update };
}
