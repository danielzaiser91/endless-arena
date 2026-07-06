import * as C from '../core/constants';
import * as A from '../core/actions';
import { CLASS_PATHS, masteriesFor, subPathsFor } from '../core/classes';
import { computeMults } from '../core/formulas';
import { enemyHp } from '../core/enemies';
import { tick } from '../core/tick';
import { EQUIP_SLOTS, initialState, type AttrKey, type EquipSlot, type GameState } from '../core/state';

/**
 * Headless "autoplay" driver shared by the sim CLI (sim/run.ts) and the balance tests
 * (tests/balance.test.ts) — implementation.md §17. Combat itself is fully automatic in this
 * game (no player HP, no clicking); the only thing that differs between an "active" and an
 * "idle" player is how often they check in to spend points, push the arena level, forge, or
 * ascend. That check-in cadence is the entire active/idle model here.
 */
export type Profile = 'active' | 'idle';

export interface AutoplayOptions {
  profile: Profile;
  maxHours: number;
  seed?: number;
  /** Stop the run early once this returns true. */
  stopWhen?: (state: GameState) => boolean;
  /** Called every `sampleEverySeconds` of simulated time. */
  onSample?: (state: GameState, elapsedSeconds: number) => void;
  sampleEverySeconds?: number;
}

export interface AutoplayResult {
  state: GameState;
  elapsedSeconds: number;
  reachedStopCondition: boolean;
  /** Longest stretch with no upgrade event at all — the no-wall metric (implementation.md §17). */
  longestStretchWithoutUpgradeSeconds: number;
}

const DECISION_INTERVAL_SEC: Record<Profile, number> = { active: 5, idle: 1200 };
const PUSH_TTK_THRESHOLD_SEC: Record<Profile, number> = { active: 12, idle: 12 };
/** How long the arena frontier may sit unpushed before ascending is considered "stalled". */
const STALL_DURATION_SEC: Record<Profile, number> = { active: 1800, idle: 7200 };

const ATTR_ORDER: AttrKey[] = ['power', 'speed', 'fortune', 'wisdom'];
const ATTR_WEIGHTS: Record<AttrKey, number> = { power: 0.4, speed: 0.3, fortune: 0.15, wisdom: 0.15 };

export function runAutoplay(opts: AutoplayOptions): AutoplayResult {
  const state = initialState(opts.seed ?? 1);
  const dt = 1;
  const maxSeconds = Math.round(opts.maxHours * 3600);
  const decisionInterval = DECISION_INTERVAL_SEC[opts.profile];
  const pushThreshold = PUSH_TTK_THRESHOLD_SEC[opts.profile];
  const stallDuration = STALL_DURATION_SEC[opts.profile];
  const sampleEvery = opts.sampleEverySeconds ?? 600;
  const attrCounters: Record<AttrKey, number> = { power: 0, speed: 0, fortune: 0, wisdom: 0 };

  let nextDecisionAt = 0;
  let nextSampleAt = 0;
  let reached = false;
  let lastUpgradeAt = 0;
  let longestStretch = 0;
  let prevSnapshot = upgradeSnapshot(state);
  let lastPushAt = 0;

  let t = 0;
  for (; t <= maxSeconds; t += dt) {
    tick(state, dt);

    if (t >= nextDecisionAt) {
      nextDecisionAt += decisionInterval;
      const arenaLevelBefore = state.arenaLevel;
      const ascensionsBefore = state.ascensions;
      const isStalled = t - lastPushAt >= stallDuration;
      decide(state, attrCounters, pushThreshold, isStalled);
      if (state.ascensions > ascensionsBefore || state.arenaLevel > arenaLevelBefore) lastPushAt = t;
    }

    const snap = upgradeSnapshot(state);
    if (snap !== prevSnapshot) {
      longestStretch = Math.max(longestStretch, t - lastUpgradeAt);
      lastUpgradeAt = t;
      prevSnapshot = snap;
    }

    if (opts.onSample && t >= nextSampleAt) {
      nextSampleAt += sampleEvery;
      opts.onSample(state, t);
    }

    if (opts.stopWhen?.(state)) { reached = true; break; }
  }
  longestStretch = Math.max(longestStretch, t - lastUpgradeAt);

  return {
    state,
    elapsedSeconds: t,
    reachedStopCondition: reached,
    longestStretchWithoutUpgradeSeconds: longestStretch,
  };
}

/** Cheap fingerprint of "did any upgrade-worthy field change" — drives the no-wall metric. */
function upgradeSnapshot(state: GameState): string {
  return [
    state.level,
    state.skillNodesLearned,
    state.attributes.power, state.attributes.speed, state.attributes.fortune, state.attributes.wisdom,
    EQUIP_SLOTS.map(s => state.forgeLevels[s]).join(','),
    EQUIP_SLOTS.map(s => state.equipment[s]?.score.toFixed(3) ?? '0').join(','),
    state.echoes,
    state.echoInvested.power + state.echoInvested.speed + state.echoInvested.fortune + state.echoInvested.wisdom,
    state.ascensions,
  ].join('|');
}

function nextAttrToSpend(counters: Record<AttrKey, number>): AttrKey {
  let best: AttrKey = 'power';
  let bestVal = Infinity;
  for (const key of ATTR_ORDER) {
    const val = counters[key] / ATTR_WEIGHTS[key];
    if (val < bestVal) { bestVal = val; best = key; }
  }
  counters[best]++;
  return best;
}

function decide(
  state: GameState,
  attrCounters: Record<AttrKey, number>,
  pushThreshold: number,
  isStalled: boolean,
): void {
  while (state.attributePoints > 0) A.spendAttributePoint(state, nextAttrToSpend(attrCounters));
  while (state.skillPoints > 0) A.learnSkillNode(state);
  while (state.echoes > 0) A.spendEcho(state, nextAttrToSpend(attrCounters));

  if (state.level >= C.CLASS_CHOICE_LEVEL && !state.classPath) A.chooseClassPath(state, CLASS_PATHS[0]);
  if (state.classPath && state.level >= C.SUBPATH_CHOICE_LEVEL && !state.subPath) {
    A.chooseSubPath(state, subPathsFor(state.classPath)[0]);
  }
  if (state.subPath && state.level >= C.MASTERY_CHOICE_LEVEL && !state.mastery) {
    A.chooseMastery(state, masteriesFor(state.subPath)[0]);
  }

  for (;;) {
    let cheapestSlot: EquipSlot | null = null;
    let cheapestCost = Infinity;
    for (const slot of EQUIP_SLOTS) {
      const cost = A.forgeCost(state, slot);
      if (cost < cheapestCost) { cheapestCost = cost; cheapestSlot = slot; }
    }
    if (cheapestSlot && state.gold >= cheapestCost) A.forgeSlot(state, cheapestSlot);
    else break;
  }

  for (;;) {
    const candidate = state.arenaLevel + 1;
    if (candidate > state.bestArenaLevel + 1) break;
    const ttk = enemyHp(candidate) / computeMults(state).dps;
    if (ttk > pushThreshold) break;
    A.setArenaLevel(state, candidate);
  }

  // Ascend once the arena frontier has sat unpushed for a while (isStalled, tracked by the
  // caller in wall-clock time) AND it is profitable — otherwise keep pushing the same run,
  // since ascending too eagerly would cap every future cycle at today's frontier forever.
  if (isStalled && A.canAscend(state) && A.echoGainOnAscend(state) > 0) A.ascend(state);
}
