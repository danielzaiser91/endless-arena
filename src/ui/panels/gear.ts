import { equipFromInbox, forgeCost, forgeSlot, salvageFromInbox, setAutoEquip } from '../../core/actions';
import { EQUIP_SLOTS, type EquipSlot, type GameState, type Item } from '../../core/state';
import { t, type Key } from '../../i18n';
import type { Panel, PanelDeps } from './types';

const SLOT_LABEL_KEYS: Record<EquipSlot, Key> = {
  weapon: 'slot.weapon',
  helmet: 'slot.helmet',
  chest: 'slot.chest',
  gloves: 'slot.gloves',
  boots: 'slot.boots',
  ring: 'slot.ring',
  amulet: 'slot.amulet',
};

const TIER_KEYS: Key[] = ['tier.0', 'tier.1', 'tier.2', 'tier.3', 'tier.4', 'tier.5'];

function tierLabel(tier: number): string {
  if (tier < TIER_KEYS.length) return t(TIER_KEYS[tier]);
  return t('tier.ascended').replace('{n}', String(tier - (TIER_KEYS.length - 1)));
}

function itemSummary(item: Item): string {
  return `${tierLabel(item.tier)} · ${t('gear.score')} ${item.score.toFixed(1)}`;
}

export function createGearPanel(deps: PanelDeps): Panel {
  const root = document.createElement('div');
  root.className = 'panel panel-gear';

  const autoRow = document.createElement('label');
  autoRow.className = 'gear-auto-row';
  const autoCheckbox = document.createElement('input');
  autoCheckbox.type = 'checkbox';
  autoCheckbox.addEventListener('change', () => {
    setAutoEquip(deps.getState(), autoCheckbox.checked);
    deps.refresh();
  });
  const autoLabel = document.createElement('span');
  autoLabel.textContent = t('gear.autoEquip');
  autoRow.append(autoCheckbox, autoLabel);
  root.appendChild(autoRow);

  const slotList = document.createElement('div');
  slotList.className = 'gear-slots';
  root.appendChild(slotList);

  const slotRows: Record<EquipSlot, { item: HTMLElement; forgeInfo: HTMLElement; forgeBtn: HTMLButtonElement }> = {} as never;
  for (const slot of EQUIP_SLOTS) {
    const row = document.createElement('div');
    row.className = 'gear-slot-row';
    const name = document.createElement('span');
    name.className = 'gear-slot-name';
    name.textContent = t(SLOT_LABEL_KEYS[slot]);
    const item = document.createElement('span');
    item.className = 'gear-slot-item';
    const forgeInfo = document.createElement('span');
    forgeInfo.className = 'gear-forge-info';
    const forgeBtn = document.createElement('button');
    forgeBtn.textContent = t('gear.forge');
    forgeBtn.addEventListener('click', () => {
      if (forgeSlot(deps.getState(), slot)) deps.refresh();
    });
    row.append(name, item, forgeInfo, forgeBtn);
    slotList.appendChild(row);
    slotRows[slot] = { item, forgeInfo, forgeBtn };
  }

  const inboxSection = document.createElement('div');
  inboxSection.className = 'gear-inbox';
  root.appendChild(inboxSection);

  function renderInbox(state: GameState): void {
    inboxSection.innerHTML = '';
    if (state.autoEquip) return;
    const title = document.createElement('div');
    title.className = 'gear-inbox-title';
    title.textContent = t('gear.inbox');
    inboxSection.appendChild(title);
    if (state.inbox.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'gear-inbox-empty';
      empty.textContent = t('gear.inboxEmpty');
      inboxSection.appendChild(empty);
      return;
    }
    state.inbox.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'gear-inbox-row';
      const label = document.createElement('span');
      label.textContent = `${t(SLOT_LABEL_KEYS[item.slot])} — ${itemSummary(item)}`;
      const equipBtn = document.createElement('button');
      equipBtn.textContent = t('gear.equip');
      equipBtn.addEventListener('click', () => {
        equipFromInbox(deps.getState(), index);
        deps.refresh();
      });
      const salvageBtn = document.createElement('button');
      salvageBtn.textContent = t('gear.salvage');
      salvageBtn.addEventListener('click', () => {
        salvageFromInbox(deps.getState(), index);
        deps.refresh();
      });
      row.append(label, equipBtn, salvageBtn);
      inboxSection.appendChild(row);
    });
  }

  let lastInboxSignature = '';

  function update(state: GameState): void {
    autoCheckbox.checked = state.autoEquip;
    for (const slot of EQUIP_SLOTS) {
      const equipped = state.equipment[slot];
      const rows = slotRows[slot];
      rows.item.textContent = equipped ? itemSummary(equipped) : t('gear.empty');
      const cost = forgeCost(state, slot);
      rows.forgeInfo.textContent = `${t('gear.forgeLevel')} ${state.forgeLevels[slot]} — ${Math.floor(cost)}g`;
      rows.forgeBtn.disabled = state.gold < cost;
    }
    const signature = `${state.autoEquip}|${state.inbox.length}`;
    if (signature !== lastInboxSignature) {
      lastInboxSignature = signature;
      renderInbox(state);
    }
  }

  return { root, update };
}
