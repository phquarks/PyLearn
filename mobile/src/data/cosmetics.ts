import { color } from '../theme';

/**
 * The shop's catalogue, shared by the shop and the wardrobe so a price and a
 * swatch can never drift apart between the two screens.
 *
 * A price of 0 means the item ships with every account. Those ids are not
 * written into `ownedItems`; ownership is decided by `owns()` below, which
 * treats free items as always owned. That keeps the saved list to the things a
 * learner actually bought.
 */

export type CosmeticSlot = 'skin' | 'hat' | 'trail';

export type Cosmetic = {
  id: string;
  name: string;
  slot: CosmeticSlot;
  /** the colour shown on the tile and worn by the snake */
  swatch: string;
  /** MaterialIcons glyph for hats and trails, which are not colour alone */
  icon?: string;
  /**
   * A fallback only. The database holds the price that is charged; this is what
   * the shop shows before that arrives, and while offline. When the two differ
   * the fetched one wins — see getShopPrices.
   */
  price: number;
};

export const cosmetics: Cosmetic[] = [
  { id: 'green', name: 'Default Green', slot: 'skin', swatch: '#58cc02', price: 0 },
  { id: 'blue', name: 'River Blue', slot: 'skin', swatch: color.primaryContainer, price: 120 },
  { id: 'gold', name: 'Golden Glider', slot: 'skin', swatch: color.secondaryContainer, price: 180 },
  { id: 'ruby', name: 'Ruby Red', slot: 'skin', swatch: color.error, price: 240 },
  { id: 'violet', name: 'Deep Violet', slot: 'skin', swatch: '#7a4ddb', price: 300 },
  { id: 'ash', name: 'Ash Grey', slot: 'skin', swatch: '#8a929c', price: 90 },

  { id: 'none', name: 'Bare head', slot: 'hat', swatch: color.surfaceHighest, icon: 'block', price: 0 },
  { id: 'cap', name: 'Cap', slot: 'hat', swatch: color.tertiaryContainer, icon: 'sports-baseball', price: 150 },
  { id: 'top', name: 'Top Hat', slot: 'hat', swatch: color.onSurfaceVariant, icon: 'auto-fix-high', price: 260 },
  { id: 'crown', name: 'Crown', slot: 'hat', swatch: color.secondaryContainer, icon: 'workspace-premium', price: 400 },

  { id: 'plain', name: 'No trail', slot: 'trail', swatch: color.surfaceHighest, icon: 'block', price: 0 },
  { id: 'spark', name: 'Sparks', slot: 'trail', swatch: color.tertiaryContainer, icon: 'auto-awesome', price: 200 },
  { id: 'leaf', name: 'Leaves', slot: 'trail', swatch: '#58cc02', icon: 'eco', price: 200 },
  { id: 'star', name: 'Stardust', slot: 'trail', swatch: color.primaryContainer, icon: 'star', price: 350 },
];

export const SLOTS: { key: CosmeticSlot; label: string }[] = [
  { key: 'skin', label: 'Skins' },
  { key: 'hat', label: 'Hats' },
  { key: 'trail', label: 'Trails' },
];

export function cosmeticById(id: string): Cosmetic | undefined {
  return cosmetics.find((item) => item.id === id);
}

export function bySlot(slot: CosmeticSlot): Cosmetic[] {
  return cosmetics.filter((item) => item.slot === slot);
}

/** free items count as owned without ever being written to the saved list */
export function owns(item: Cosmetic, ownedItems: string[]): boolean {
  return item.price === 0 || ownedItems.includes(item.id);
}

/** gems handed over at the end of a lesson, on top of the XP */
export const GEMS_PER_LESSON = 15;

/** the one consumable: tops the hearts back up */
export const HEART_REFILL_PRICE = 60;
