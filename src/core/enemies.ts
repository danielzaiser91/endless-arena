import * as C from './constants';

export function isBoss(level: number): boolean {
  return level % C.BOSS_EVERY_N_LEVELS === 0;
}

export function enemyHp(level: number): number {
  const base = C.ENEMY_HP_BASE * Math.pow(C.ENEMY_HP_GROWTH, level - 1);
  return isBoss(level) ? base * C.BOSS_HP_MULT : base;
}

export function enemyXp(level: number): number {
  return C.ENEMY_XP_BASE * Math.pow(C.ENEMY_XP_GROWTH, level - 1);
}

export function enemyGold(level: number): number {
  return C.ENEMY_GOLD_BASE * Math.pow(C.ENEMY_GOLD_GROWTH, level - 1);
}
