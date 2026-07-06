import * as C from './constants';
import { computeMults, type Mults, xpForLevel } from './formulas';
import { enemyGold, enemyHp, enemyXp } from './enemies';
import { rollItem } from './loot';
import { rngInt, rngNext } from './rng';
import { EQUIP_SLOTS, type GameState } from './state';

/**
 * The one tick shared by live play, offline progress, sim, and tests (architecture rule).
 * Pure: reads/writes only the passed GameState, no DOM/Three/Audio, no Math.random().
 */
export function tick(state: GameState, dt: number): Mults {
  const mults = computeMults(state);
  state.combatProgress += mults.dps * dt;

  let hp = enemyHp(state.arenaLevel);
  let guard = 0;
  while (state.combatProgress >= hp && guard < 10_000) {
    state.combatProgress -= hp;
    onKill(state, mults);
    hp = enemyHp(state.arenaLevel);
    guard++;
  }
  return mults;
}

function onKill(state: GameState, mults: Mults): void {
  state.kills++;
  state.lifetimeKills++;
  state.gold += enemyGold(state.arenaLevel) * mults.fortuneMult;
  gainXp(state, enemyXp(state.arenaLevel) * mults.wisdomMult);

  if (state.arenaLevel > state.bestArenaLevel) state.bestArenaLevel = state.arenaLevel;
  if (state.arenaLevel > state.lifetimeBestArenaLevel) state.lifetimeBestArenaLevel = state.arenaLevel;

  if (rngNext(state.rng) < C.DROP_CHANCE_BASE) {
    const slot = EQUIP_SLOTS[rngInt(state.rng, EQUIP_SLOTS.length)];
    const item = rollItem(slot, state.arenaLevel, mults.lootMult, state.rng);
    resolveDrop(state, item);
  }
}

function gainXp(state: GameState, amount: number): void {
  state.xp += amount;
  let guard = 0;
  while (state.xp >= xpForLevel(state.level) && guard < 10_000) {
    state.xp -= xpForLevel(state.level);
    state.level++;
    state.attributePoints += C.ATTR_POINTS_PER_LEVEL;
    state.skillPoints += C.SKILL_POINTS_PER_LEVEL;
    guard++;
  }
}

/** Auto-equip-or-salvage when on (default); otherwise queue for manual review (implementation.md §7). */
function resolveDrop(state: GameState, item: ReturnType<typeof rollItem>): void {
  if (!state.autoEquip) {
    state.inbox.push(item);
    if (state.inbox.length > C.MAX_INBOX_SIZE) state.inbox.shift();
    return;
  }
  const current = state.equipment[item.slot];
  if (!current || item.score > current.score) {
    if (current) state.gold += current.score * C.SALVAGE_GOLD_PER_SCORE;
    state.equipment[item.slot] = item;
  } else {
    state.gold += item.score * C.SALVAGE_GOLD_PER_SCORE;
  }
}
