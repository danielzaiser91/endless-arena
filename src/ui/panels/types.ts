import type { GameState } from '../../core/state';

/** Shared wiring for every panel — mutate only via core/actions.ts, then call refresh(). */
export interface PanelDeps {
  getState: () => GameState;
  refresh: () => void;
  /** Full teardown+rebuild of every panel — needed after a language switch (static labels). */
  rebuildUI: () => void;
  fx: {
    classUp: () => void;
    ascend: () => void;
  };
}

export interface Panel {
  root: HTMLElement;
  update: (state: GameState) => void;
}
