import { setAudioLevel, setAudioMuted, setLanguage } from '../../core/actions';
import type { AudioSettings, GameState } from '../../core/state';
import { getLang, setLang, t, type Lang } from '../../i18n';
import { updateVolumes } from '../../audio/mixer';
import type { Panel, PanelDeps } from './types';

const LANGS: Lang[] = ['en', 'de'];
const CHANNELS: Array<{ key: keyof Omit<AudioSettings, 'muted'>; labelKey: 'settings.master' | 'settings.music' | 'settings.sfx' }> = [
  { key: 'master', labelKey: 'settings.master' },
  { key: 'music', labelKey: 'settings.music' },
  { key: 'sfx', labelKey: 'settings.sfx' },
];

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

  const audioSection = document.createElement('div');
  audioSection.className = 'settings-audio';
  root.appendChild(audioSection);

  const sliders: Record<string, HTMLInputElement> = {};
  for (const { key, labelKey } of CHANNELS) {
    const row = document.createElement('div');
    row.className = 'settings-slider-row';
    const label = document.createElement('span');
    label.textContent = t(labelKey);
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.05';
    slider.addEventListener('input', () => {
      const state = deps.getState();
      setAudioLevel(state, key, Number(slider.value));
      updateVolumes(state.audio);
    });
    row.append(label, slider);
    audioSection.appendChild(row);
    sliders[key] = slider;
  }

  const muteRow = document.createElement('label');
  muteRow.className = 'settings-mute-row';
  const muteCheckbox = document.createElement('input');
  muteCheckbox.type = 'checkbox';
  muteCheckbox.addEventListener('change', () => {
    const state = deps.getState();
    setAudioMuted(state, muteCheckbox.checked);
    updateVolumes(state.audio);
  });
  const muteLabel = document.createElement('span');
  muteLabel.textContent = t('settings.mute');
  muteRow.append(muteCheckbox, muteLabel);
  audioSection.appendChild(muteRow);

  function update(state: GameState): void {
    for (const lang of LANGS) langButtons[lang].classList.toggle('active', state.lang === lang);
    for (const { key } of CHANNELS) {
      if (document.activeElement !== sliders[key]) sliders[key].value = String(state.audio[key]);
    }
    muteCheckbox.checked = state.audio.muted;
  }

  return { root, update };
}
