import * as C from '../../core/constants';
import { chooseClassPath, chooseSubPath, chooseMastery } from '../../core/actions';
import { CLASS_PATHS, subPathsFor, masteriesFor, type ClassPath } from '../../core/classes';
import type { GameState } from '../../core/state';
import { t, type Key } from '../../i18n';
import type { Panel, PanelDeps } from './types';

function nameKey(id: string): Key {
  return `path.name.${id}` as Key;
}

export function createPathPanel(deps: PanelDeps): Panel {
  const root = document.createElement('div');
  root.className = 'panel panel-path';

  const summary = document.createElement('div');
  summary.className = 'path-summary';
  root.appendChild(summary);

  const choiceRow = document.createElement('div');
  choiceRow.className = 'path-choice-row';
  root.appendChild(choiceRow);

  function buildChoiceButtons(ids: readonly string[], onPick: (id: string) => void): void {
    choiceRow.innerHTML = '';
    for (const id of ids) {
      const btn = document.createElement('button');
      btn.className = 'path-choice-btn';
      btn.textContent = t(nameKey(id));
      btn.addEventListener('click', () => {
        onPick(id);
        deps.fx.classUp();
        deps.refresh();
      });
      choiceRow.appendChild(btn);
    }
  }

  let lastSignature = '';

  function update(state: GameState): void {
    summary.textContent = [
      `${t('path.class')}: ${state.classPath ? t(nameKey(state.classPath)) : t('path.none')}`,
      `${t('path.sub')}: ${state.subPath ? t(nameKey(state.subPath)) : t('path.none')}`,
      `${t('path.mastery')}: ${state.mastery ? t(nameKey(state.mastery)) : t('path.none')}`,
    ].join('  ·  ');

    const signature = `${state.level}|${state.classPath}|${state.subPath}|${state.mastery}`;
    if (signature === lastSignature) return;
    lastSignature = signature;

    if (!state.classPath) {
      if (state.level >= C.CLASS_CHOICE_LEVEL) {
        buildChoiceButtons(CLASS_PATHS, (id) => chooseClassPath(state, id as ClassPath));
      } else {
        choiceRow.innerHTML = '';
        choiceRow.textContent = t('path.lockedClass').replace('{lvl}', String(C.CLASS_CHOICE_LEVEL));
      }
    } else if (!state.subPath) {
      if (state.level >= C.SUBPATH_CHOICE_LEVEL) {
        buildChoiceButtons(subPathsFor(state.classPath), (id) => chooseSubPath(state, id));
      } else {
        choiceRow.innerHTML = '';
        choiceRow.textContent = t('path.lockedSub').replace('{lvl}', String(C.SUBPATH_CHOICE_LEVEL));
      }
    } else if (!state.mastery) {
      if (state.level >= C.MASTERY_CHOICE_LEVEL) {
        buildChoiceButtons(masteriesFor(state.subPath), (id) => chooseMastery(state, id));
      } else {
        choiceRow.innerHTML = '';
        choiceRow.textContent = t('path.lockedMastery').replace('{lvl}', String(C.MASTERY_CHOICE_LEVEL));
      }
    } else {
      choiceRow.innerHTML = '';
      choiceRow.textContent = t('path.complete');
    }
  }

  return { root, update };
}
