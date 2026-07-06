import { setNickname } from '../../core/actions';
import type { GameState } from '../../core/state';
import { t } from '../../i18n';
import type { LeaderboardEntry } from '../../net/leaderboard';
import type { Panel, PanelDeps } from './types';

/** Lazy-loaded so players who never open the leaderboard don't pay for the Firebase SDK (§12 perf budget). */
function loadNet() {
  return Promise.all([import('../../net/firebase'), import('../../net/leaderboard')]);
}

const CONNECT_TIMEOUT_MS = 6000;

export function createRankingPanel(deps: PanelDeps): Panel {
  const root = document.createElement('div');
  root.className = 'panel panel-ranking';

  const nickRow = document.createElement('div');
  nickRow.className = 'ranking-nick-row';
  const nickInput = document.createElement('input');
  nickInput.type = 'text';
  nickInput.maxLength = 16;
  nickInput.placeholder = t('ranking.nickname');
  const submitBtn = document.createElement('button');
  submitBtn.textContent = t('ranking.submit');
  nickRow.append(nickInput, submitBtn);
  root.appendChild(nickRow);

  const statusEl = document.createElement('div');
  statusEl.className = 'ranking-status';
  root.appendChild(statusEl);

  const listEl = document.createElement('div');
  listEl.className = 'ranking-list';
  root.appendChild(listEl);

  let uid: string | null = null;
  let unsubscribe: (() => void) | null = null;

  submitBtn.addEventListener('click', () => {
    const state = deps.getState();
    setNickname(state, nickInput.value);
    nickInput.value = state.nickname;
    deps.refresh();
    statusEl.textContent = t('ranking.loading');
    loadNet()
      .then(([, { submitScore }]) => submitScore(state, state.nickname))
      .then(() => { statusEl.textContent = ''; })
      .catch(() => { statusEl.textContent = t('ranking.offline'); });
  });

  function renderList(entries: LeaderboardEntry[]): void {
    listEl.innerHTML = '';
    entries.forEach((entry, index) => {
      const row = document.createElement('div');
      row.className = 'ranking-row';
      if (entry.uid === uid) row.classList.add('ranking-row-you');
      const rank = document.createElement('span');
      rank.className = 'ranking-rank';
      rank.textContent = `#${index + 1}`;
      const name = document.createElement('span');
      name.className = 'ranking-name';
      name.textContent = entry.name + (entry.uid === uid ? ` (${t('ranking.you')})` : '');
      const level = document.createElement('span');
      level.className = 'ranking-level';
      level.textContent = `Lv ${entry.bestLevel}`;
      row.append(rank, name, level);
      listEl.appendChild(row);
    });
  }

  function showLocalFallback(state: GameState): void {
    statusEl.textContent = t('ranking.offline');
    listEl.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'ranking-row ranking-row-you';
    row.textContent = `${state.nickname || t('ranking.you')} — Lv ${state.lifetimeBestArenaLevel}`;
    listEl.appendChild(row);
  }

  function update(state: GameState): void {
    if (document.activeElement !== nickInput) nickInput.value = state.nickname;
  }

  let activation = 0;

  function onActivate(): void {
    const myActivation = ++activation;
    let settled = false;
    statusEl.textContent = t('ranking.loading');

    setTimeout(() => {
      // Firestore's web SDK retries silently instead of erroring fast when the backend is
      // unreachable/not provisioned yet — without this, "Loading…" would hang forever.
      if (!settled && myActivation === activation) showLocalFallback(deps.getState());
    }, CONNECT_TIMEOUT_MS);

    loadNet()
      .then(([{ ensureSignedIn }, { subscribeLeaderboard }]) => {
        if (myActivation !== activation) return; // tab was closed again before this resolved
        ensureSignedIn()
          .then((user) => { uid = user.uid; })
          .catch(() => { /* anonymous auth not enabled yet — subscribe below still surfaces the fallback */ });
        unsubscribe = subscribeLeaderboard(
          (entries) => { settled = true; statusEl.textContent = ''; renderList(entries); },
          () => { settled = true; showLocalFallback(deps.getState()); },
        );
      })
      .catch(() => { settled = true; showLocalFallback(deps.getState()); });
  }

  function onDeactivate(): void {
    activation++;
    unsubscribe?.();
    unsubscribe = null;
  }

  return { root, update, onActivate, onDeactivate };
}
