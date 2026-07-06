import { makeRng, type RngState } from './rng';
import type { ClassPath } from './classes';
import { SAVE_VERSION } from './constants';

export type EquipSlot = 'weapon' | 'helmet' | 'chest' | 'gloves' | 'boots' | 'ring' | 'amulet';
export const EQUIP_SLOTS: EquipSlot[] = ['weapon', 'helmet', 'chest', 'gloves', 'boots', 'ring', 'amulet'];

export interface Item {
  slot: EquipSlot;
  itemLevel: number;
  /** 0..5 = common..mythic; 6+ = "Ascended +<tier-5>" (unbounded — implementation.md §7). */
  tier: number;
  affixCount: number;
  power: number;
  speed: number;
  critChance: number;
  critDamage: number;
  fortune: number;
  wisdom: number;
  /** Single compressed number used by auto-equip to compare items (implementation.md §7). */
  score: number;
}

export interface Attributes {
  power: number;
  speed: number;
  fortune: number;
  wisdom: number;
}

export type AttrKey = keyof Attributes;

export interface GameState {
  saveVersion: number;
  rng: RngState;
  lang: 'en' | 'de';
  createdAt: number;
  savedAt: number;

  level: number;
  xp: number;
  attributePoints: number;
  attributes: Attributes;
  skillPoints: number;
  skillNodesLearned: number;

  classPath: ClassPath | null;
  subPath: string | null;
  mastery: string | null;

  equipment: Record<EquipSlot, Item | null>;
  forgeLevels: Record<EquipSlot, number>;
  autoEquip: boolean;
  /** Drops awaiting manual review when autoEquip is off (implementation.md §7). */
  inbox: Item[];

  gold: number;
  arenaLevel: number;
  bestArenaLevel: number;
  lifetimeBestArenaLevel: number;
  kills: number;
  lifetimeKills: number;
  combatProgress: number;

  echoes: number;
  echoInvested: Attributes;
  ascensions: number;

  /** Leaderboard nickname (implementation.md §11) — empty until first submit. */
  nickname: string;

  /** Persisted mixer levels, 0..1 (implementation.md §13). */
  audio: AudioSettings;
}

export interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
}

function emptyAttributes(): Attributes {
  return { power: 0, speed: 0, fortune: 0, wisdom: 0 };
}

function emptyEquipment(): Record<EquipSlot, Item | null> {
  return { weapon: null, helmet: null, chest: null, gloves: null, boots: null, ring: null, amulet: null };
}

function emptyForgeLevels(): Record<EquipSlot, number> {
  return { weapon: 0, helmet: 0, chest: 0, gloves: 0, boots: 0, ring: 0, amulet: 0 };
}

export function initialState(seed = Date.now()): GameState {
  return {
    saveVersion: SAVE_VERSION,
    rng: makeRng(seed),
    lang: 'en',
    createdAt: Date.now(),
    savedAt: 0,

    level: 1,
    xp: 0,
    attributePoints: 0,
    attributes: emptyAttributes(),
    skillPoints: 0,
    skillNodesLearned: 0,

    classPath: null,
    subPath: null,
    mastery: null,

    equipment: emptyEquipment(),
    forgeLevels: emptyForgeLevels(),
    autoEquip: true,
    inbox: [],

    gold: 0,
    arenaLevel: 1,
    bestArenaLevel: 0,
    lifetimeBestArenaLevel: 0,
    kills: 0,
    lifetimeKills: 0,
    combatProgress: 0,

    echoes: 0,
    echoInvested: emptyAttributes(),
    ascensions: 0,

    nickname: '',

    audio: { master: 0.8, music: 0.6, sfx: 0.8, muted: false },
  };
}
