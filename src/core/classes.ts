/**
 * The only 3 decision points in the whole game (implementation.md §5) — everyone starts as
 * 'adventurer', then chooses a path at L10, a sub-path at L25, a mastery at L50.
 * v1 note: all paths share the same generic skill-tree value curve (see skills.ts) — per-path
 * flavor (names, visuals, procs) is a content-authoring pass (milestone M5), not a balance concern.
 */

export type ClassPath = 'mage' | 'warrior' | 'ranger';
export const CLASS_PATHS: ClassPath[] = ['mage', 'warrior', 'ranger'];

export const SUBPATHS: Record<ClassPath, readonly [string, string]> = {
  mage: ['pyromancer', 'stormcaller'],
  warrior: ['berserker', 'guardian'],
  ranger: ['sniper', 'windrunner'],
};

export const MASTERIES: Record<string, readonly [string, string]> = {
  pyromancer: ['infernoLord', 'sunPriest'],
  stormcaller: ['tempest', 'stormHerald'],
  berserker: ['warlord', 'bloodReaver'],
  guardian: ['sentinel', 'colossus'],
  sniper: ['deadeye', 'hawkLord'],
  windrunner: ['galeDancer', 'tempestArcher'],
};

export function subPathsFor(path: ClassPath): readonly [string, string] {
  return SUBPATHS[path];
}

export function masteriesFor(subPath: string): readonly [string, string] {
  return MASTERIES[subPath];
}
