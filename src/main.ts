import './style.css';
import { setLang, getLang, t, type Lang } from './i18n';
import { startVersionCheck } from './ui/updateBanner';
import { GameView } from './render/game';

const LANG_KEY = 'endless-arena-lang';
setLang((localStorage.getItem(LANG_KEY) as Lang | null) ?? 'en');

const app = document.getElementById('app')!;
app.innerHTML = '';

const langBtn = document.createElement('button');
langBtn.id = 'lang-btn';
langBtn.textContent = t('lang.toggle');
langBtn.addEventListener('click', () => {
  const next: Lang = getLang() === 'en' ? 'de' : 'en';
  setLang(next);
  localStorage.setItem(LANG_KEY, next);
  langBtn.textContent = t('lang.toggle');
});
app.appendChild(langBtn);

const game = new GameView(app);

startVersionCheck(() => game.save());
