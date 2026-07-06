import * as C from './constants';
import { rngInt, rngNext, type RngState } from './rng';
import type { EquipSlot, Item } from './state';

type Affix = 'power' | 'speed' | 'critChance' | 'critDamage' | 'fortune' | 'wisdom';
const AFFIX_POOL: Affix[] = ['power', 'speed', 'critChance', 'critDamage', 'fortune', 'wisdom'];
const AFFIX_BASE: Record<Affix, number> = {
  power: 0.03, speed: 0.025, critChance: 0.01, critDamage: 0.05, fortune: 0.03, wisdom: 0.03,
};

const MYTHIC_INDEX = C.RARITY_BASE_WEIGHTS.length - 1;

/** Rolls a rarity tier 0..5 (common..mythic); beyond Mythic, chains into unbounded "Ascended +N". */
export function rollTier(lootMult: number, rng: RngState): number {
  const weights = C.RARITY_BASE_WEIGHTS.map((w, i) => w * Math.pow(lootMult, i));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rngNext(rng) * total;
  let tier = 0;
  for (let i = 0; i < weights.length; i++) {
    if (roll < weights[i]) { tier = i; break; }
    roll -= weights[i];
    tier = i;
  }
  while (tier === MYTHIC_INDEX && rngNext(rng) < C.ASCENDED_CHAIN_CHANCE) tier++;
  return tier;
}

export function tierPowerMult(tier: number): number {
  if (tier <= MYTHIC_INDEX) return C.RARITY_POWER_MULT[tier];
  return C.RARITY_POWER_MULT[MYTHIC_INDEX] * Math.pow(C.ASCENDED_TIER_STEP_MULT, tier - MYTHIC_INDEX);
}

export function tierAffixCount(tier: number): number {
  return tier <= MYTHIC_INDEX ? C.RARITY_AFFIX_COUNT[tier] : C.RARITY_AFFIX_COUNT[MYTHIC_INDEX];
}

export function rollItem(slot: EquipSlot, itemLevel: number, lootMult: number, rng: RngState): Item {
  const tier = rollTier(lootMult, rng);
  const affixCount = tierAffixCount(tier);
  const tierMult = tierPowerMult(tier);
  const levelFactor = 1 + itemLevel * C.ITEM_LEVEL_POWER_PCT;

  const stats = { power: 0, speed: 0, critChance: 0, critDamage: 0, fortune: 0, wisdom: 0 };
  const pool = [...AFFIX_POOL];
  for (let i = 0; i < affixCount && pool.length > 0; i++) {
    const stat = pool.splice(rngInt(rng, pool.length), 1)[0];
    const variance = 0.7 + rngNext(rng) * 0.6;
    stats[stat] += AFFIX_BASE[stat] * tierMult * levelFactor * variance;
  }

  const score = stats.power + stats.speed + stats.critChance * 2 + stats.critDamage
    + stats.fortune * 0.6 + stats.wisdom * 0.4;

  return { slot, itemLevel, tier, affixCount, ...stats, score };
}
