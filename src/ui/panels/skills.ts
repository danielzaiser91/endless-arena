import { learnSkillNode, respecSkills } from '../../core/actions';
import { nodeAt, DUMP_NODE_INDEX } from '../../core/skills';
import type { GameState } from '../../core/state';
import { t } from '../../i18n';
import type { Panel, PanelDeps } from './types';

function describeNode(effect: ReturnType<typeof nodeAt>['effect']): string {
  switch (effect.type) {
    case 'power': return `+${(effect.pct * 100).toFixed(0)}% ${t('attr.power')}`;
    case 'speed': return `+${(effect.pct * 100).toFixed(0)}% ${t('attr.speed')}`;
    case 'critChance': return `+${(effect.add * 100).toFixed(0)}% ${t('skills.critChance')}`;
    case 'critDamage': return `+${(effect.pct * 100).toFixed(0)}% ${t('skills.critDamage')}`;
    case 'gold': return `+${(effect.pct * 100).toFixed(0)}% ${t('skills.gold')}`;
    case 'loot': return `+${(effect.pct * 100).toFixed(0)}% ${t('skills.loot')}`;
  }
}

export function createSkillsPanel(deps: PanelDeps): Panel {
  const root = document.createElement('div');
  root.className = 'panel panel-skills';

  const summary = document.createElement('div');
  summary.className = 'skills-summary';
  root.appendChild(summary);

  const nextRow = document.createElement('div');
  nextRow.className = 'skills-next';
  root.appendChild(nextRow);

  const learnBtn = document.createElement('button');
  learnBtn.textContent = t('skills.learn');
  learnBtn.addEventListener('click', () => {
    if (learnSkillNode(deps.getState())) deps.refresh();
  });
  root.appendChild(learnBtn);

  const respecBtn = document.createElement('button');
  respecBtn.className = 'skills-respec';
  respecBtn.textContent = t('stats.respec');
  respecBtn.addEventListener('click', () => {
    respecSkills(deps.getState());
    deps.refresh();
  });
  root.appendChild(respecBtn);

  function update(state: GameState): void {
    summary.textContent = `${t('skills.points')}: ${state.skillPoints} — ${t('skills.learned')}: ${state.skillNodesLearned}`;
    const node = nodeAt(state.skillNodesLearned);
    const isDump = state.skillNodesLearned >= DUMP_NODE_INDEX;
    nextRow.textContent = `${t('skills.next')}: ${describeNode(node.effect)}${isDump ? ` (${t('skills.infinite')})` : ''}`;
    learnBtn.disabled = state.skillPoints <= 0;
  }

  return { root, update };
}
