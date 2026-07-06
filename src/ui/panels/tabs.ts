import type { GameState } from '../../core/state';
import { t, type Key } from '../../i18n';
import { createStatsPanel } from './stats';
import { createSkillsPanel } from './skills';
import { createGearPanel } from './gear';
import { createPathPanel } from './path';
import { createAscensionPanel } from './ascension';
import { createSettingsPanel } from './settings';
import type { Panel, PanelDeps } from './types';

interface TabDef {
  id: string;
  labelKey: Key;
  build: (deps: PanelDeps) => Panel;
}

const TAB_DEFS: TabDef[] = [
  { id: 'stats', labelKey: 'tab.stats', build: createStatsPanel },
  { id: 'skills', labelKey: 'tab.skills', build: createSkillsPanel },
  { id: 'gear', labelKey: 'tab.gear', build: createGearPanel },
  { id: 'path', labelKey: 'tab.path', build: createPathPanel },
  { id: 'ascension', labelKey: 'tab.ascension', build: createAscensionPanel },
  { id: 'settings', labelKey: 'tab.settings', build: createSettingsPanel },
];

export interface TabShellDeps {
  getState: () => GameState;
  fx: PanelDeps['fx'];
}

export interface TabShell {
  root: HTMLElement;
  /** Cheap value refresh — call after any state mutation and periodically. */
  refresh: () => void;
  destroy: () => void;
}

export function createTabShell(container: HTMLElement, deps: TabShellDeps): TabShell {
  const root = document.createElement('div');
  root.id = 'panel-shell';

  const tabBar = document.createElement('div');
  tabBar.className = 'panel-tabbar';
  const content = document.createElement('div');
  content.className = 'panel-content';
  root.append(tabBar, content);
  container.appendChild(root);

  let panels: Record<string, Panel> = {};
  let activeId = TAB_DEFS[0].id;
  const tabButtons: Record<string, HTMLButtonElement> = {};

  const panelDeps: PanelDeps = {
    getState: deps.getState,
    refresh: () => refresh(),
    rebuildUI: () => rebuild(),
    fx: deps.fx,
  };

  function setActive(id: string): void {
    activeId = id;
    for (const def of TAB_DEFS) {
      const isActive = def.id === id;
      tabButtons[def.id].classList.toggle('active', isActive);
      panels[def.id].root.classList.toggle('active', isActive);
    }
    panels[activeId].update(deps.getState());
  }

  function build(): void {
    tabBar.innerHTML = '';
    content.innerHTML = '';
    panels = {};
    for (const def of TAB_DEFS) {
      const panel = def.build(panelDeps);
      panels[def.id] = panel;
      content.appendChild(panel.root);

      const btn = document.createElement('button');
      btn.className = 'panel-tab-btn';
      btn.textContent = t(def.labelKey);
      btn.addEventListener('click', () => setActive(def.id));
      tabButtons[def.id] = btn;
      tabBar.appendChild(btn);
    }
    setActive(activeId);
  }

  function rebuild(): void {
    build();
  }

  function refresh(): void {
    const state = deps.getState();
    panels[activeId].update(state);
  }

  build();

  return {
    root,
    refresh,
    destroy: () => root.remove(),
  };
}
