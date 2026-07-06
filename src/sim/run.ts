import { computeMults } from '../core/formulas';
import { enemyHp } from '../core/enemies';
import { runAutoplay, type Profile } from './autoplay';
import type { GameState } from '../core/state';

const CHECKPOINTS: Record<string, (s: GameState) => boolean> = {
  adventurer: s => s.level >= 1,
  path_choice: s => s.classPath !== null,
  subpath: s => s.subPath !== null,
  mastery: s => s.mastery !== null,
  first_ascension: s => s.ascensions >= 1,
  level100: s => s.lifetimeBestArenaLevel >= 100,
  level250: s => s.lifetimeBestArenaLevel >= 250,
  level1000: s => s.lifetimeBestArenaLevel >= 1000,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (name: string, def: string): string => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : def;
  };
  return {
    until: get('until', 'level1000'),
    profile: get('profile', 'active') as Profile,
    maxHours: Number(get('maxHours', get('hours', '20'))),
    seed: Number(get('seed', '1')),
  };
}

function fmtHours(seconds: number): string {
  return (seconds / 3600).toFixed(2) + 'h';
}

function snapshotLine(state: GameState, elapsedSeconds: number): string {
  const mults = computeMults(state);
  const ttk = enemyHp(state.arenaLevel) / mults.dps;
  return [
    `t=${fmtHours(elapsedSeconds)}`,
    `charLvl=${state.level}`,
    `arena=${state.arenaLevel}`,
    `bestArena=${state.bestArenaLevel}`,
    `lifetimeBest=${state.lifetimeBestArenaLevel}`,
    `class=${state.classPath ?? '-'}/${state.subPath ?? '-'}/${state.mastery ?? '-'}`,
    `dps=${mults.dps.toFixed(1)}`,
    `ttk=${ttk.toFixed(1)}s`,
    `gold=${state.gold.toFixed(0)}`,
    `echoes=${state.echoes}`,
    `ascensions=${state.ascensions}`,
  ].join('  ');
}

function main(): void {
  const { until, profile, maxHours, seed } = parseArgs();
  const stopWhen = CHECKPOINTS[until];
  if (!stopWhen) {
    console.error(`Unknown checkpoint "${until}". Known: ${Object.keys(CHECKPOINTS).join(', ')}`);
    process.exit(1);
  }

  console.log(`Simulating profile=${profile} until="${until}" (max ${maxHours}h, seed ${seed})\n`);
  const result = runAutoplay({
    profile,
    maxHours,
    seed,
    stopWhen,
    sampleEverySeconds: 600,
    onSample: (state, elapsed) => console.log(snapshotLine(state, elapsed)),
  });

  console.log('\n' + (result.reachedStopCondition
    ? `Reached "${until}"`
    : `Did NOT reach "${until}" within ${maxHours}h`));
  console.log(snapshotLine(result.state, result.elapsedSeconds));
  console.log(`Longest stretch without an upgrade event: ${(result.longestStretchWithoutUpgradeSeconds / 60).toFixed(1)} min`);
  process.exit(result.reachedStopCondition ? 0 : 1);
}

main();
