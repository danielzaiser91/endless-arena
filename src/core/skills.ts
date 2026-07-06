/**
 * One shared 18-node skill-tree template (implementation.md §6). All class paths use this same
 * value curve in v1 — only names/flavor differ per path (M5 content pass). Node 17 (the last) is
 * the infinite dump node: further points repeat it forever (DUMP_NODE_POWER_PCT each).
 */

export type SkillEffect =
  | { type: 'power'; pct: number }
  | { type: 'speed'; pct: number }
  | { type: 'critChance'; add: number }
  | { type: 'critDamage'; pct: number }
  | { type: 'gold'; pct: number }
  | { type: 'loot'; pct: number };

export interface SkillNode {
  id: string;
  effect: SkillEffect;
}

export const SKILL_TREE: SkillNode[] = [
  { id: 'n0', effect: { type: 'power', pct: 0.03 } },
  { id: 'n1', effect: { type: 'speed', pct: 0.02 } },
  { id: 'n2', effect: { type: 'power', pct: 0.03 } },
  { id: 'n3', effect: { type: 'critChance', add: 0.02 } },
  { id: 'n4', effect: { type: 'gold', pct: 0.05 } },
  { id: 'n5', effect: { type: 'power', pct: 0.04 } },
  { id: 'n6', effect: { type: 'speed', pct: 0.03 } },
  { id: 'n7', effect: { type: 'critDamage', pct: 0.1 } },
  { id: 'n8', effect: { type: 'loot', pct: 0.05 } },
  { id: 'n9', effect: { type: 'power', pct: 0.05 } },
  { id: 'n10', effect: { type: 'speed', pct: 0.03 } },
  { id: 'n11', effect: { type: 'critChance', add: 0.03 } },
  { id: 'n12', effect: { type: 'power', pct: 0.05 } },
  { id: 'n13', effect: { type: 'gold', pct: 0.08 } },
  { id: 'n14', effect: { type: 'critDamage', pct: 0.15 } },
  { id: 'n15', effect: { type: 'speed', pct: 0.04 } },
  { id: 'n16', effect: { type: 'power', pct: 0.06 } },
  { id: 'n17', effect: { type: 'power', pct: 0.02 } }, // infinite dump node — repeats forever
];

export const DUMP_NODE_INDEX = SKILL_TREE.length - 1;

export function nodeAt(learnedCount: number): SkillNode {
  return SKILL_TREE[Math.min(learnedCount, DUMP_NODE_INDEX)];
}
