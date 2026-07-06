import { t } from '../i18n';

/**
 * Update banner (ported from the sibling project "Stardust to Singularity", where this
 * pattern is already proven in production — see implementation.md §16): polls version.json
 * (cache-busted) and shows a clickable banner on a new version. Click → save + full
 * version-bust (unregister service worker, clear caches, reload with ?v=timestamp).
 */

const INITIAL_MS = 60 * 1000;
const INTERVAL_MS = 3 * 60 * 1000;

let shown = false;

export function startVersionCheck(saveNow: () => void): void {
  if (import.meta.env.DEV) return; // "dev" version locally — polling would be meaningless
  setTimeout(() => void poll(saveNow), INITIAL_MS);
}

async function poll(saveNow: () => void): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?_=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { version?: string };
      if (data.version && data.version !== __APP_VERSION__) {
        showBanner(saveNow);
        return; // found → stop polling
      }
    }
  } catch { /* offline etc. — retry next interval */ }
  setTimeout(() => void poll(saveNow), INTERVAL_MS);
}

export function showBanner(saveNow: () => void): void {
  if (shown) return;
  shown = true;
  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.textContent = t('update.banner');
  banner.addEventListener('click', () => {
    banner.textContent = t('update.reloading');
    void bustAndReload(saveNow);
  });
  document.getElementById('ui')?.append(banner);
}

async function bustAndReload(saveNow: () => void): Promise<void> {
  saveNow();
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    await Promise.all(regs.map(r => r.unregister()));
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch { /* best effort — the URL buster below still works */ }
  window.location.href = window.location.pathname + '?v=' + Date.now();
}
