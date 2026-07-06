import { describe, expect, it } from 'vitest';
import { initialState } from '../src/core/state';
import { xpForLevel, computeMults } from '../src/core/formulas';
import { enemyGold, enemyHp, enemyXp, isBoss } from '../src/core/enemies';
import { rollItem } from '../src/core/loot';
import { makeRng, rngNext } from '../src/core/rng';
import { tick } from '../src/core/tick';
import * as A from '../src/core/actions';
import { serialize, deserialize } from '../src/core/save';
import { CLASS_PATHS, subPathsFor, masteriesFor } from '../src/core/classes';

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const seqA = Array.from({ length: 20 }, () => rngNext(a));
    const seqB = Array.from({ length: 20 }, () => rngNext(b));
    expect(seqA).toEqual(seqB);
  });

  it('produces values in [0, 1)', () => {
    const rng = makeRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rngNext(rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('curves', () => {
  it('xpForLevel grows monotonically', () => {
    let prev = 0;
    for (let level = 1; level <= 100; level++) {
      const xp = xpForLevel(level);
      expect(xp).toBeGreaterThan(prev);
      prev = xp;
    }
  });

  it('enemyHp grows monotonically and bosses hit harder than the level before', () => {
    let prev = 0;
    for (let level = 1; level <= 100; level++) {
      const hp = enemyHp(level);
      expect(hp).toBeGreaterThan(prev);
      prev = hp;
    }
    expect(isBoss(10)).toBe(true);
    expect(isBoss(11)).toBe(false);
    expect(enemyHp(10)).toBeGreaterThan(enemyHp(9) * 1.2);
  });

  it('enemyXp and enemyGold are positive and finite for a long range', () => {
    for (const level of [1, 10, 50, 100, 1000]) {
      expect(Number.isFinite(enemyXp(level))).toBe(true);
      expect(Number.isFinite(enemyGold(level))).toBe(true);
      expect(enemyXp(level)).toBeGreaterThan(0);
      expect(enemyGold(level)).toBeGreaterThan(0);
    }
  });
});

describe('loot', () => {
  it('rollItem always returns a finite, positive score', () => {
    const rng = makeRng(1);
    for (let i = 0; i < 500; i++) {
      const item = rollItem('weapon', 10, 1, rng);
      expect(Number.isFinite(item.score)).toBe(true);
      expect(item.score).toBeGreaterThan(0);
      expect(item.tier).toBeGreaterThanOrEqual(0);
    }
  });

  it('higher lootMult shifts the average rolled tier upward', () => {
    const rngLow = makeRng(3);
    const rngHigh = makeRng(3);
    let sumLow = 0, sumHigh = 0;
    const n = 400;
    for (let i = 0; i < n; i++) {
      sumLow += rollItem('weapon', 1, 1, rngLow).tier;
      sumHigh += rollItem('weapon', 1, 6, rngHigh).tier;
    }
    expect(sumHigh / n).toBeGreaterThan(sumLow / n);
  });
});

describe('tick + combat', () => {
  it('kills grant XP, gold, and eventually a level-up', () => {
    const state = initialState(1);
    const startLevel = state.level;
    for (let i = 0; i < 200; i++) tick(state, 1);
    expect(state.kills).toBeGreaterThan(0);
    expect(state.gold).toBeGreaterThan(0);
    expect(state.level).toBeGreaterThan(startLevel);
    expect(state.bestArenaLevel).toBeGreaterThanOrEqual(1);
  });

  it('never produces negative combatProgress or NaN dps', () => {
    const state = initialState(2);
    for (let i = 0; i < 500; i++) {
      const mults = tick(state, 1);
      expect(state.combatProgress).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(mults.dps)).toBe(true);
    }
  });
});

describe('actions', () => {
  it('class milestones can only be chosen once, in order, past their level gate', () => {
    const state = initialState(1);
    expect(A.chooseClassPath(state, 'mage')).toBe(false); // level too low
    state.level = 10;
    expect(A.chooseClassPath(state, 'mage')).toBe(true);
    expect(A.chooseClassPath(state, 'warrior')).toBe(false); // already chosen

    expect(A.chooseSubPath(state, subPathsFor('mage')[0])).toBe(false); // level too low
    state.level = 25;
    expect(A.chooseSubPath(state, subPathsFor('mage')[0])).toBe(true);

    state.level = 50;
    const mastery = masteriesFor(state.subPath!)[0];
    expect(A.chooseMastery(state, mastery)).toBe(true);
    expect(state.mastery).toBe(mastery);
  });

  it('respec refunds points exactly', () => {
    const state = initialState(1);
    state.attributePoints = 10;
    A.spendAttributePoint(state, 'power');
    A.spendAttributePoint(state, 'power');
    A.spendAttributePoint(state, 'speed');
    expect(state.attributePoints).toBe(7);
    A.respecAttributes(state);
    expect(state.attributePoints).toBe(10);
    expect(state.attributes).toEqual({ power: 0, speed: 0, fortune: 0, wisdom: 0 });
  });

  it('ascend resets the run but keeps class choice, echoes, and lifetime stats', () => {
    const state = initialState(1);
    state.level = 50;
    state.classPath = 'mage';
    state.subPath = subPathsFor('mage')[0];
    state.mastery = masteriesFor(state.subPath)[0];
    state.bestArenaLevel = 65;
    state.lifetimeBestArenaLevel = 65;
    state.gold = 999;
    state.attributes.power = 20;

    expect(A.echoGainOnAscend(state)).toBe(Math.floor((65 - 15) / 5));
    const ok = A.ascend(state);
    expect(ok).toBe(true);
    expect(state.level).toBe(1);
    expect(state.gold).toBe(0);
    expect(state.attributes.power).toBe(0);
    expect(state.bestArenaLevel).toBe(0);
    expect(state.lifetimeBestArenaLevel).toBe(65); // survives — the leaderboard score
    expect(state.classPath).toBe('mage'); // survives — no re-deciding classes
    expect(state.echoes).toBe(10);
    expect(state.ascensions).toBe(1);
  });

  it('cannot ascend before mastery is chosen', () => {
    const state = initialState(1);
    state.bestArenaLevel = 200;
    expect(A.canAscend(state)).toBe(false);
    expect(A.ascend(state)).toBe(false);
  });

  it('class/subpath/mastery data is internally consistent', () => {
    for (const path of CLASS_PATHS) {
      const subs = subPathsFor(path);
      expect(subs.length).toBe(2);
      for (const sub of subs) expect(masteriesFor(sub).length).toBe(2);
    }
  });
});

describe('save/load', () => {
  it('round-trips a modified state exactly for known fields', () => {
    const state = initialState(1);
    state.level = 12;
    state.gold = 456;
    state.classPath = 'warrior';
    state.attributes.speed = 3;

    const restored = deserialize(serialize(state));
    expect(restored.level).toBe(12);
    expect(restored.gold).toBe(456);
    expect(restored.classPath).toBe('warrior');
    expect(restored.attributes.speed).toBe(3);
    expect(restored.saveVersion).toBe(state.saveVersion);
  });

  it('fills in defaults for a save missing newer fields (template-revive)', () => {
    const legacy = { level: 5, gold: 10 };
    const restored = deserialize(JSON.stringify(legacy));
    expect(restored.level).toBe(5);
    expect(restored.gold).toBe(10);
    expect(restored.attributes).toEqual({ power: 0, speed: 0, fortune: 0, wisdom: 0 });
    expect(restored.inbox).toEqual([]);
  });
});

describe('computeMults', () => {
  it('stays finite and positive across a wide range of investment', () => {
    const state = initialState(1);
    state.attributes = { power: 500, speed: 500, fortune: 500, wisdom: 500 };
    state.skillNodesLearned = 200;
    state.mastery = 'infernoLord';
    const mults = computeMults(state);
    for (const v of Object.values(mults)) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });
});
