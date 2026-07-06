import * as C from './constants';
import { CLASS_PATHS, subPathsFor, masteriesFor, type ClassPath } from './classes';
import {
  EQUIP_SLOTS, type AttrKey, type EquipSlot, type GameState,
} from './state';

/** All player-triggered mutations live here (architecture rule) — render/UI never mutate directly. */

export function setArenaLevel(state: GameState, level: number): void {
  const clamped = Math.max(1, Math.min(level, state.bestArenaLevel + 1));
  if (clamped === state.arenaLevel) return;
  state.arenaLevel = clamped;
  state.combatProgress = 0;
}

export function spendAttributePoint(state: GameState, key: AttrKey): boolean {
  if (state.attributePoints <= 0) return false;
  state.attributePoints--;
  state.attributes[key]++;
  return true;
}

/** Free & instant — builds are toys, not traps (implementation.md §4). */
export function respecAttributes(state: GameState): void {
  const spent = state.attributes.power + state.attributes.speed + state.attributes.fortune + state.attributes.wisdom;
  state.attributePoints += spent;
  state.attributes = { power: 0, speed: 0, fortune: 0, wisdom: 0 };
}

export function learnSkillNode(state: GameState): boolean {
  if (state.skillPoints <= 0) return false;
  state.skillPoints--;
  state.skillNodesLearned++;
  return true;
}

export function respecSkills(state: GameState): void {
  state.skillPoints += state.skillNodesLearned;
  state.skillNodesLearned = 0;
}

export function setAutoEquip(state: GameState, on: boolean): void {
  state.autoEquip = on;
}

export function setLanguage(state: GameState, lang: GameState['lang']): void {
  state.lang = lang;
}

export function equipFromInbox(state: GameState, index: number): void {
  const item = state.inbox[index];
  if (!item) return;
  state.inbox.splice(index, 1);
  const current = state.equipment[item.slot];
  if (current) state.gold += current.score * C.SALVAGE_GOLD_PER_SCORE;
  state.equipment[item.slot] = item;
}

export function salvageFromInbox(state: GameState, index: number): void {
  const item = state.inbox[index];
  if (!item) return;
  state.inbox.splice(index, 1);
  state.gold += item.score * C.SALVAGE_GOLD_PER_SCORE;
}

export function forgeCost(state: GameState, slot: EquipSlot): number {
  return C.FORGE_BASE_COST * Math.pow(C.FORGE_COST_GROWTH, state.forgeLevels[slot]);
}

export function forgeSlot(state: GameState, slot: EquipSlot): boolean {
  const cost = forgeCost(state, slot);
  if (state.gold < cost) return false;
  state.gold -= cost;
  state.forgeLevels[slot]++;
  return true;
}

// ── Class milestones — the only 3 decision points in the game (implementation.md §5) ──────

export function chooseClassPath(state: GameState, path: ClassPath): boolean {
  if (state.level < C.CLASS_CHOICE_LEVEL || state.classPath !== null) return false;
  if (!CLASS_PATHS.includes(path)) return false;
  state.classPath = path;
  return true;
}

export function chooseSubPath(state: GameState, subPath: string): boolean {
  if (!state.classPath || state.level < C.SUBPATH_CHOICE_LEVEL || state.subPath !== null) return false;
  if (!subPathsFor(state.classPath).includes(subPath)) return false;
  state.subPath = subPath;
  return true;
}

export function chooseMastery(state: GameState, mastery: string): boolean {
  if (!state.subPath || state.level < C.MASTERY_CHOICE_LEVEL || state.mastery !== null) return false;
  if (!masteriesFor(state.subPath).includes(mastery)) return false;
  state.mastery = mastery;
  return true;
}

// ── Ascension — the anti-wall meta progression (implementation.md §9) ─────────────────────
// Eligibility is gated by the one-time character-level milestone track (mastery chosen, ~L50);
// the *reward* scales with bestArenaLevel — the infinite grind axis — via echoGainOnAscend().

export function canAscend(state: GameState): boolean {
  return state.mastery !== null;
}

export function echoGainOnAscend(state: GameState): number {
  return Math.max(0, Math.floor((state.bestArenaLevel - C.ASCENSION_ECHO_LEVEL_OFFSET) / C.ASCENSION_ECHO_DIVISOR));
}

export function ascend(state: GameState): boolean {
  if (!canAscend(state)) return false;
  state.echoes += echoGainOnAscend(state);
  state.ascensions++;

  state.level = 1;
  state.xp = 0;
  state.attributePoints = 0;
  state.attributes = { power: 0, speed: 0, fortune: 0, wisdom: 0 };
  state.skillPoints = 0;
  state.skillNodesLearned = 0;

  for (const slot of EQUIP_SLOTS) {
    state.equipment[slot] = null;
    state.forgeLevels[slot] = 0;
  }
  state.inbox = [];

  state.gold = 0;
  state.arenaLevel = 1;
  state.bestArenaLevel = 0;
  state.kills = 0;
  state.combatProgress = 0;
  return true;
}

export function spendEcho(state: GameState, key: AttrKey): boolean {
  if (state.echoes <= 0) return false;
  state.echoes--;
  state.echoInvested[key]++;
  return true;
}
