import { setLanguage } from '../../core/actions';
import type { GameState } from '../../core/state';
import { getLang, setLang, t, type Lang } from '../../i18n';
import type { Panel, PanelDeps } from './types';

const LANGS: Lang[] = ['en', 'de'];

export function createSettingsPanel(deps: PanelDeps): Panel {
  const root = document.createElement('div');
  root.className = 'panel panel-settings';

  const langRow = document.createElement('div');
  langRow.className = 'settings-lang-row';
  const langLabel = document.createElement('span');
  langLabel.textContent = t('settings.language');
  langRow.appendChild(langLabel);

  const langButtons: Record<Lang, HTMLButtonElement> = {} as never;
  for (const lang of LANGS) {
    const btn = document.createElement('button');
    btn.textContent = lang.toUpperCase();
    btn.addEventListener('click', () => {
      if (getLang() === lang) return;
      setLanguage(deps.getState(), lang);
      setLang(lang);
      deps.rebuildUI();
    });
    langRow.appendChild(btn);
    langButtons[lang] = btn;
  }
  root.appendChild(langRow);

  function update(state: GameState): void {
    for (const lang of LANGS) langButtons[lang].classList.toggle('active', state.lang === lang);
  }

  return { root, update };
}
