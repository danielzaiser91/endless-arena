/**
 * Every tunable balance number lives here — nowhere else (implementation.md rule).
 * Balance changes = edit a constant → `npm run sim` → check bands in implementation.md §17.
 */

// ── Save schema (bump only on semantic save changes; see save.ts) ──────────────
export const SAVE_VERSION = 1;

// ── Enemies (procedural, infinite — implementation.md §8) ──────────────────────
export const ENEMY_HP_BASE = 10;
export const ENEMY_HP_GROWTH = 1.2;
export const BOSS_EVERY_N_LEVELS = 10;
// Must stay < ENEMY_HP_GROWTH, otherwise the level right after a boss would have LESS effective
// HP than the boss itself (a monotonicity break — see tests/core.test.ts).
export const BOSS_HP_MULT = 1.1;

export const ENEMY_XP_BASE = 4;
export const ENEMY_XP_GROWTH = 1.2;
export const ENEMY_GOLD_BASE = 2;
export const ENEMY_GOLD_GROWTH = 1.2;

// ── Combat (implementation.md §3) ───────────────────────────────────────────────
export const BASE_POWER = 2;
export const BASE_ATTACKS_PER_SECOND = 1.0;
export const BASE_CRIT_CHANCE = 0.05;
export const BASE_CRIT_DAMAGE_MULT = 1.5;
/** Soft UI nudge threshold — never a hard block (implementation.md §3, §10). */
export const TTK_WARN_SECONDS = 30;

// ── Attributes — 4 stats, 3 points per level (implementation.md §4) ────────────
export const ATTR_POINTS_PER_LEVEL = 3;
export const ATTR_POWER_PCT = 0.02;
export const ATTR_SPEED_PCT = 0.015;
export const ATTR_FORTUNE_PCT = 0.02;
export const ATTR_WISDOM_PCT = 0.02;

// ── XP curve ────────────────────────────────────────────────────────────────────
export const XP_BASE = 220;
export const XP_GROWTH = 1.135;

// ── Skill points & tree (implementation.md §6) ──────────────────────────────────
export const SKILL_POINTS_PER_LEVEL = 1;
/** Every node beyond the authored tree feeds the infinite dump node — never wasted. */
export const DUMP_NODE_POWER_PCT = 0.02;

// ── Class milestones (implementation.md §5) — the only 3 decision points, ever ─
export const CLASS_CHOICE_LEVEL = 10;
export const SUBPATH_CHOICE_LEVEL = 25;
export const MASTERY_CHOICE_LEVEL = 50;
export const MASTERY_CAPSTONE_POWER_PCT = 0.15;

// ── Loot & rarity ladder (implementation.md §7) ─────────────────────────────────
/** Base weights for tiers 0..5 = common..mythic; Fortune tilts the roll toward higher tiers. */
export const RARITY_BASE_WEIGHTS = [50, 27, 13, 7, 2.5, 0.5];
export const RARITY_POWER_MULT = [1, 1.3, 1.7, 2.3, 3.2, 4.5];
export const RARITY_AFFIX_COUNT = [1, 2, 3, 4, 5, 5];
/** Beyond Mythic (index 5): each successful chain roll bumps the tier by +1 — unbounded. */
export const ASCENDED_CHAIN_CHANCE = 0.35;
export const ASCENDED_TIER_STEP_MULT = 1.15;
export const DROP_CHANCE_BASE = 0.35;
export const ITEM_LEVEL_POWER_PCT = 0.01;

// ── Forge (gold sink, infinite — implementation.md §7) ──────────────────────────
export const FORGE_BASE_COST = 25;
export const FORGE_COST_GROWTH = 1.35;
export const FORGE_PCT_PER_LEVEL = 0.03;

/** Old items compress to gold (auto-salvage) — see resolveDrop() in actions.ts. */
export const SALVAGE_GOLD_PER_SCORE = 50;
/** Cap on the manual-review inbox when autoEquip is off (oldest dropped when full). */
export const MAX_INBOX_SIZE = 30;

// ── Ascension / Echoes (meta progression — implementation.md §9) ──────────────
// Eligibility gate = mastery chosen (canAscend() in actions.ts), not a level number here;
// echo gain scales with bestArenaLevel (the infinite grind axis) via the offset/divisor below.
export const ASCENSION_ECHO_LEVEL_OFFSET = 15;
export const ASCENSION_ECHO_DIVISOR = 5;
export const ECHO_ATTR_BONUS_PCT = 0.05;
