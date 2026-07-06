/** Seedable PRNG (mulberry32) — deterministic, no Math.random() in core. */
export interface RngState { seed: number; }

export function makeRng(seed: number): RngState {
  return { seed: seed >>> 0 };
}

export function rngNext(s: RngState): number {
  s.seed |= 0;
  s.seed = (s.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(s.seed ^ (s.seed >>> 15), 1 | s.seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [0, maxExclusive). */
export function rngInt(s: RngState, maxExclusive: number): number {
  return Math.floor(rngNext(s) * maxExclusive);
}
