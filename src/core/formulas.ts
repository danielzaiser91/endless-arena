import * as C from './constants';
import { EQUIP_SLOTS, type AttrKey, type GameState } from './state';
import { SKILL_TREE } from './skills';

export interface Mults {
  powerMult: number;
  attacksPerSecond: number;
  critChance: number;
  critDamageMult: number;
  /** Gold-gain multiplier (Fortune attribute + gold-affix skill nodes + gear). */
  fortuneMult: number;
  /** Loot-rarity-weight multiplier (Fortune attribute + loot-affix skill nodes + gear). */
  lootMult: number;
  wisdomMult: number;
  dps: number;
}

const ATTR_PCT: Record<AttrKey, number> = {
  power: C.ATTR_POWER_PCT,
  speed: C.ATTR_SPEED_PCT,
  fortune: C.ATTR_FORTUNE_PCT,
  wisdom: C.ATTR_WISDOM_PCT,
};

export function attrMult(state: GameState, key: AttrKey): number {
  return state.attributes[key] * ATTR_PCT[key] + state.echoInvested[key] * C.ECHO_ATTR_BONUS_PCT;
}

interface SkillTotals {
  power: number; speed: number; critChance: number; critDamage: number; gold: number; loot: number;
}

export function skillMults(state: GameState): SkillTotals {
  const totals: SkillTotals = { power: 0, speed: 0, critChance: 0, critDamage: 0, gold: 0, loot: 0 };
  const learned = Math.min(state.skillNodesLearned, SKILL_TREE.length);
  for (let i = 0; i < learned; i++) {
    const e = SKILL_TREE[i].effect;
    switch (e.type) {
      case 'power': totals.power += e.pct; break;
      case 'speed': totals.speed += e.pct; break;
      case 'critChance': totals.critChance += e.add; break;
      case 'critDamage': totals.critDamage += e.pct; break;
      case 'gold': totals.gold += e.pct; break;
      case 'loot': totals.loot += e.pct; break;
    }
  }
  const extraDumpPoints = Math.max(0, state.skillNodesLearned - SKILL_TREE.length);
  totals.power += extraDumpPoints * C.DUMP_NODE_POWER_PCT;
  return totals;
}

interface GearTotals {
  power: number; speed: number; critChance: number; critDamage: number; fortune: number; wisdom: number;
}

export function gearMults(state: GameState): GearTotals {
  const totals: GearTotals = { power: 0, speed: 0, critChance: 0, critDamage: 0, fortune: 0, wisdom: 0 };
  for (const slot of EQUIP_SLOTS) {
    const item = state.equipment[slot];
    if (!item) continue;
    const forgeMult = 1 + state.forgeLevels[slot] * C.FORGE_PCT_PER_LEVEL;
    totals.power += item.power * forgeMult;
    totals.speed += item.speed * forgeMult;
    totals.critChance += item.critChance * forgeMult;
    totals.critDamage += item.critDamage * forgeMult;
    totals.fortune += item.fortune * forgeMult;
    totals.wisdom += item.wisdom * forgeMult;
  }
  return totals;
}

export function computeMults(state: GameState): Mults {
  const skill = skillMults(state);
  const gear = gearMults(state);
  const masteryBonus = state.mastery ? C.MASTERY_CAPSTONE_POWER_PCT : 0;

  const powerMult = 1 + attrMult(state, 'power') + skill.power + gear.power + masteryBonus;
  const speedMult = 1 + attrMult(state, 'speed') + skill.speed + gear.speed;
  const attacksPerSecond = C.BASE_ATTACKS_PER_SECOND * speedMult;
  const critChance = Math.min(1, C.BASE_CRIT_CHANCE + skill.critChance + gear.critChance);
  const critDamageMult = C.BASE_CRIT_DAMAGE_MULT + skill.critDamage + gear.critDamage;
  const fortuneMult = 1 + attrMult(state, 'fortune') + skill.gold + gear.fortune;
  const lootMult = 1 + attrMult(state, 'fortune') + skill.loot + gear.fortune;
  const wisdomMult = 1 + attrMult(state, 'wisdom') + gear.wisdom;

  const avgCritMult = 1 + critChance * (critDamageMult - 1);
  const dps = C.BASE_POWER * powerMult * attacksPerSecond * avgCritMult;

  return { powerMult, attacksPerSecond, critChance, critDamageMult, fortuneMult, lootMult, wisdomMult, dps };
}

export function xpForLevel(level: number): number {
  return C.XP_BASE * Math.pow(C.XP_GROWTH, level - 1);
}
