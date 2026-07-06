import { SAVE_VERSION } from './constants';
import { initialState, type GameState } from './state';

/**
 * Versioned save (implementation.md §15). New fields default via the initialState() template
 * (template-revive); semantic changes need a real migration branch here + a SAVE_VERSION bump.
 */
export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(json: string): GameState {
  return migrate(JSON.parse(json));
}

function migrate(saved: Partial<GameState>): GameState {
  const template = initialState();
  const merged: GameState = { ...template, ...saved };
  merged.attributes = { ...template.attributes, ...saved.attributes };
  merged.equipment = { ...template.equipment, ...saved.equipment };
  merged.forgeLevels = { ...template.forgeLevels, ...saved.forgeLevels };
  merged.echoInvested = { ...template.echoInvested, ...saved.echoInvested };
  merged.rng = saved.rng ?? template.rng;
  merged.inbox = saved.inbox ?? [];
  merged.saveVersion = SAVE_VERSION;
  return merged;
}
