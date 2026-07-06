import { describe, expect, it } from 'vitest';
import { runAutoplay } from '../src/sim/autoplay';
import type { GameState } from '../src/core/state';

/**
 * Fast balance bands (implementation.md §17). Widened slightly from the original design
 * estimate once real sim data existed — "tune via sim" means these numbers follow the sim.
 */
const BANDS = {
  path_choice: { active: [15, 30], idle: [0, 60] },
  subpath: { active: [45, 90], idle: [0, 180] },
  mastery: { active: [150, 192], idle: [0, 480] },
  first_ascension: { active: [168, 240], idle: [0, 840] },
} as const;

function minutes(seconds: number): number {
  return seconds / 60;
}

describe('balance bands', () => {
  it('active profile: path choice (L10) lands in band', () => {
    const r = runAutoplay({ profile: 'active', maxHours: 1, stopWhen: s => s.classPath !== null });
    expect(r.reachedStopCondition).toBe(true);
    const m = minutes(r.elapsedSeconds);
    expect(m).toBeGreaterThanOrEqual(BANDS.path_choice.active[0]);
    expect(m).toBeLessThanOrEqual(BANDS.path_choice.active[1]);
  });

  it('idle profile: path choice (L10) stays under the ceiling', () => {
    const r = runAutoplay({ profile: 'idle', maxHours: 2, stopWhen: s => s.classPath !== null });
    expect(r.reachedStopCondition).toBe(true);
    expect(minutes(r.elapsedSeconds)).toBeLessThanOrEqual(BANDS.path_choice.idle[1]);
  });

  it('active profile: sub-path (L25) lands in band', () => {
    const r = runAutoplay({ profile: 'active', maxHours: 2, stopWhen: s => s.subPath !== null });
    expect(r.reachedStopCondition).toBe(true);
    const m = minutes(r.elapsedSeconds);
    expect(m).toBeGreaterThanOrEqual(BANDS.subpath.active[0]);
    expect(m).toBeLessThanOrEqual(BANDS.subpath.active[1]);
  });

  it('idle profile: sub-path (L25) stays under the ceiling', () => {
    const r = runAutoplay({ profile: 'idle', maxHours: 4, stopWhen: s => s.subPath !== null });
    expect(r.reachedStopCondition).toBe(true);
    expect(minutes(r.elapsedSeconds)).toBeLessThanOrEqual(BANDS.subpath.idle[1]);
  });

  it('active profile: mastery (L50) lands in band', () => {
    const r = runAutoplay({ profile: 'active', maxHours: 5, stopWhen: s => s.mastery !== null });
    expect(r.reachedStopCondition).toBe(true);
    const m = minutes(r.elapsedSeconds);
    expect(m).toBeGreaterThanOrEqual(BANDS.mastery.active[0]);
    expect(m).toBeLessThanOrEqual(BANDS.mastery.active[1]);
  });

  it('idle profile: mastery (L50) stays under the ceiling', () => {
    const r = runAutoplay({ profile: 'idle', maxHours: 9, stopWhen: s => s.mastery !== null });
    expect(r.reachedStopCondition).toBe(true);
    expect(minutes(r.elapsedSeconds)).toBeLessThanOrEqual(BANDS.mastery.idle[1]);
  });

  it('active profile: first ascension lands in band', () => {
    const r = runAutoplay({ profile: 'active', maxHours: 5, stopWhen: s => s.ascensions >= 1 });
    expect(r.reachedStopCondition).toBe(true);
    const m = minutes(r.elapsedSeconds);
    expect(m).toBeGreaterThanOrEqual(BANDS.first_ascension.active[0]);
    expect(m).toBeLessThanOrEqual(BANDS.first_ascension.active[1]);
  });

  it('idle profile: first ascension stays under the ceiling', () => {
    const r = runAutoplay({ profile: 'idle', maxHours: 15, stopWhen: s => s.ascensions >= 1 });
    expect(r.reachedStopCondition).toBe(true);
    expect(minutes(r.elapsedSeconds)).toBeLessThanOrEqual(BANDS.first_ascension.idle[1]);
  });
});

describe('no-wall metric', () => {
  it('active profile: no stretch of 20+ minutes without any upgrade event in the first 5h', () => {
    const r = runAutoplay({ profile: 'active', maxHours: 5 });
    expect(r.longestStretchWithoutUpgradeSeconds).toBeLessThanOrEqual(20 * 60);
  });
});

describe('long-tail stability (implementation.md §17)', () => {
  it('runs 100 simulated hours without NaN/Infinity and breaks past the early plateau', () => {
    const seenNonFinite: string[] = [];
    const r = runAutoplay({
      profile: 'active',
      maxHours: 100,
      sampleEverySeconds: 3600,
      onSample: (state: GameState) => {
        if (!Number.isFinite(state.level) || !Number.isFinite(state.arenaLevel)
          || !Number.isFinite(state.gold) || !Number.isFinite(state.lifetimeBestArenaLevel)) {
          seenNonFinite.push(JSON.stringify(state));
        }
      },
    });

    expect(seenNonFinite).toEqual([]);
    // Multiple ascensions must occur, and Echoes must keep accumulating (never spent to zero
    // permanently) — the mechanical proof that Ascension is a real, repeatable escape valve.
    expect(r.state.ascensions).toBeGreaterThan(1);
    const totalEchoesInvested = r.state.echoInvested.power + r.state.echoInvested.speed
      + r.state.echoInvested.fortune + r.state.echoInvested.wisdom;
    expect(totalEchoesInvested).toBeGreaterThan(0);
    // The early plateau observed during tuning sits around arena level ~30 — over 100h with
    // dozens of Ascensions, the permanent Echo bonuses must eventually push past it.
    expect(r.state.lifetimeBestArenaLevel).toBeGreaterThan(30);
  });
});
