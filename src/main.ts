import './style.css';
import { setLang, getLang, t, type Lang } from './i18n';
import { startVersionCheck } from './ui/updateBanner';

const LANG_KEY = 'endless-arena-lang';
setLang((localStorage.getItem(LANG_KEY) as Lang | null) ?? 'en');

function render(): void {
  const ui = document.getElementById('ui')!;
  ui.innerHTML = `
    <div id="landing">
      <div class="sword">⚔️</div>
      <h1>${t('app.title')}</h1>
      <p>${t('app.tagline')}</p>
      <p>${t('app.status')}</p>
      <button id="lang-btn">${t('lang.toggle')}</button>
    </div>
  `;
  document.getElementById('lang-btn')!.addEventListener('click', () => {
    const next: Lang = getLang() === 'en' ? 'de' : 'en';
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
    render();
  });
}
render();

// No save game yet (core engine only, M1) — banner still needs a callback to save on reload.
startVersionCheck(() => { /* nothing to save until the game exists */ });
