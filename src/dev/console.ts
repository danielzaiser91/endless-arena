import { setArenaLevel } from '../core/actions';
import { tick } from '../core/tick';
import type { GameState } from '../core/state';
import { showBanner } from '../ui/updateBanner';

/**
 * `window.dev` — manual poke console for every stage of the game (implementation.md §17).
 * Deliberately NOT stripped in production builds: balance testers need it on the live site too.
 */
export interface DevConsole {
  state: () => GameState;
  grant: (path: string, value: number) => void;
  tick: (seconds: number) => void;
  setArenaLevel: (level: number) => void;
  fakeUpdate: () => void;
}

export interface DevConsoleDeps {
  getState: () => GameState;
  refresh: () => void;
  save: () => void;
}

function setByPath(target: GameState, path: string, value: number): void {
  const parts = path.split('.');
  const last = parts.pop()!;
  let obj: Record<string, unknown> = target as unknown as Record<string, unknown>;
  for (const part of parts) {
    const next = obj[part];
    if (typeof next !== 'object' || next === null) return;
    obj = next as Record<string, unknown>;
  }
  obj[last] = value;
}

export function installDevConsole(deps: DevConsoleDeps): void {
  const api: DevConsole = {
    state: () => deps.getState(),
    grant: (path, value) => {
      setByPath(deps.getState(), path, value);
      deps.refresh();
    },
    tick: (seconds) => {
      tick(deps.getState(), seconds);
      deps.refresh();
    },
    setArenaLevel: (level) => {
      setArenaLevel(deps.getState(), level);
      deps.refresh();
    },
    fakeUpdate: () => showBanner(deps.save),
  };
  (window as unknown as { dev: DevConsole }).dev = api;
}
