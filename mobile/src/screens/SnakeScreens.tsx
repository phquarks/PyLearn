import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  bySlot,
  cosmeticById,
  HEART_REFILL_PRICE,
  owns,
  SLOTS,
  type Cosmetic,
  type CosmeticSlot,
} from '../data/cosmetics';
import type { Action, State } from '../state/store';
import { buyHearts, getErrorMessage, purchaseItem } from '../api/progress';
import { color, edge, radius, space, type } from '../theme';
import { SnakeCreature } from '../components/SnakeCreature';
import { ChunkyButton, Icon, Note, sink } from '../components/ui';

function ScreenHeader({ title, gems, onBack }: { title: string; gems: number; onBack: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top, height: 68 + insets.top }]}>
      <Pressable accessibilityLabel="Back to profile" accessibilityRole="button" onPress={onBack} style={styles.back}>
        <Icon name="arrow-back" size={26} tint={color.onSurfaceVariant} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.gems}>
        <Icon name="diamond" size={18} tint={color.onSecondaryFixed} />
        <Text style={styles.gemsText}>{gems}</Text>
      </View>
    </View>
  );
}

/** the snake as currently dressed, used as the preview on both screens */
function SnakePreview({ state }: { state: State }) {
  const skin = cosmeticById(state.snakeSkin);

  return (
    <View style={styles.preview}>
      <SnakeCreature
        hatId={state.snakeHat}
        size={280}
        skinId={state.snakeSkin}
        trailId={state.snakeTrail}
      />

      <View style={styles.previewTag}>
        <Text style={styles.previewTagText}>{skin?.name ?? 'Default Green'}</Text>
      </View>
    </View>
  );
}

export function CustomizeScreen({ state, dispatch }: { state: State; dispatch: (action: Action) => void }) {
  const insets = useSafeAreaInsets();
  const [slot, setSlot] = useState<CosmeticSlot>('skin');
  const items = bySlot(slot);
  const worn = { skin: state.snakeSkin, hat: state.snakeHat, trail: state.snakeTrail };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: 68 + insets.top + 16,
          paddingBottom: 120 + insets.bottom,
          paddingHorizontal: space.screen,
        }}
      >
        <Text style={styles.display}>Sneaky</Text>
        <Text style={styles.sub}>Your companion through the course. Dress him however you like.</Text>

        <SnakePreview state={state} />

        <Text style={styles.sectionHead}>Customize</Text>
        <View style={styles.tabs}>
          {SLOTS.map((entry) => (
            <Pressable
              key={entry.key}
              onPress={() => setSlot(entry.key)}
              style={[styles.tab, slot === entry.key ? styles.tabActive : null]}
            >
              <Text style={[styles.tabText, slot === entry.key ? styles.tabTextActive : null]}>
                {entry.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.grid}>
          {items.map((item) => {
            const held = owns(item, state.ownedItems);
            const selected = worn[slot] === item.id;

            return (
              <Pressable
                accessibilityLabel={`${item.name}${held ? '' : ', locked'}`}
                accessibilityRole="button"
                disabled={!held}
                key={item.id}
                onPress={() => dispatch({ type: 'EQUIP_COSMETIC', id: item.id })}
                style={({ pressed }) => [
                  styles.swatch,
                  selected ? styles.swatchSelected : null,
                  held ? null : styles.swatchLocked,
                  sink(pressed && held, edge.card),
                ]}
              >
                <View style={[styles.dot, { backgroundColor: item.swatch }]}>
                  {!held ? (
                    <Icon name="lock" size={22} tint="#ffffff" />
                  ) : selected ? (
                    <Icon name="check" size={22} tint="#ffffff" />
                  ) : item.icon ? (
                    <Icon name={item.icon} size={22} tint="#ffffff" />
                  ) : null}
                </View>
                <Text style={styles.swatchName}>{item.name}</Text>
                {held ? null : (
                  <View style={styles.priceRow}>
                    <Icon name="diamond" size={13} tint={color.price} />
                    <Text style={styles.priceSmall}>{item.price}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <ChunkyButton
          icon="storefront"
          label="Go to shop"
          onPress={() => dispatch({ type: 'GO_TO', screen: 'shop' })}
          style={{ marginTop: space.md }}
          tone="ghost"
        />
      </ScrollView>
    </View>
  );
}

export function ShopScreen({ state, dispatch }: { state: State; dispatch: (action: Action) => void }) {
  const insets = useSafeAreaInsets();
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  /* The purchase is not shown as done until the server has taken the gems.
     Showing it first and correcting afterwards would mean an item briefly
     appearing owned when the balance never covered it. */
  async function buy(item: Cosmetic) {
    setBusy(item.id);
    setError('');

    try {
      const result = await purchaseItem(item.id);
      dispatch({ type: 'APPLY_PURCHASE', gems: result.gems, ownedItems: result.owned_items });
      setFlash(`${item.name} is yours. Put it on from Sneaky's page.`);
    } catch (buyError) {
      setFlash('');
      setError(getErrorMessage(buyError));
    } finally {
      setBusy('');
    }
  }

  async function refill() {
    setBusy('hearts');
    setError('');

    try {
      const result = await buyHearts();
      dispatch({ type: 'APPLY_HEARTS', gems: result.gems, hearts: result.hearts, nextAt: '' });
      setFlash('Hearts topped back up to five.');
    } catch (heartError) {
      setFlash('');
      setError(getErrorMessage(heartError));
    } finally {
      setBusy('');
    }
  }

  const forSale = SLOTS.map((entry) => ({
    ...entry,
    items: bySlot(entry.key).filter((item) => item.price > 0),
  }));
  const heartsFull = state.hearts >= 5;

  return (
    <View style={styles.screen}>
      <ScreenHeader gems={state.gems} onBack={() => dispatch({ type: 'GO_TO', screen: 'customize' })} title="Shop" />
      <ScrollView
        contentContainerStyle={{
          paddingTop: 68 + insets.top + 16,
          paddingBottom: 120 + insets.bottom,
          paddingHorizontal: space.screen,
        }}
      >
        <Text style={styles.display}>Snake Shop</Text>
        <Text style={styles.sub}>Gems come from finished lessons. Spend them here.</Text>

        {flash ? <Note>{flash}</Note> : null}
        {error ? <Note tone="error">{error}</Note> : null}

        <Text style={styles.sectionHead}>Hearts</Text>
        <View style={styles.item}>
          <View style={styles.itemArt}>
            <Icon name="favorite" size={52} tint={color.error} />
          </View>
          <Text style={styles.itemName}>Heart Refill</Text>
          <Text style={styles.itemNote}>
            {heartsFull ? 'Your hearts are already full.' : `Back up to 5 from ${state.hearts}.`}
          </Text>
          <BuyButton
            affordable={state.gems >= HEART_REFILL_PRICE && busy === ''}
            disabledLabel={heartsFull ? 'Full' : undefined}
            onPress={() => void refill()}
            owned={false}
            price={HEART_REFILL_PRICE}
            sold={heartsFull}
          />
        </View>

        {forSale.map((group) => (
          <View key={group.key}>
            <Text style={styles.sectionHead}>{group.label}</Text>
            <View style={styles.shop}>
              {group.items.map((item) => {
                const held = owns(item, state.ownedItems);

                return (
                  <View key={item.id} style={styles.item}>
                    <View style={[styles.itemArt, { backgroundColor: item.swatch }]}>
                      <Icon name={item.icon ?? 'palette'} size={44} tint="#ffffff" />
                    </View>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <BuyButton
                      affordable={state.gems >= item.price && busy === ''}
                      onPress={() => void buy(item)}
                      owned={held}
                      price={item.price}
                      sold={held}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <ChunkyButton
          icon="checkroom"
          label="Back to Sneaky"
          onPress={() => dispatch({ type: 'GO_TO', screen: 'customize' })}
          style={{ marginTop: space.md }}
          tone="ghost"
        />
      </ScrollView>
    </View>
  );
}

/**
 * One control covering the three states a price can be in: already yours,
 * affordable, or out of reach. The last one still shows the price rather than
 * hiding it, so the gap is something to aim at.
 */
function BuyButton({
  price,
  owned,
  sold,
  affordable,
  onPress,
  disabledLabel,
}: {
  price: number;
  owned: boolean;
  sold: boolean;
  affordable: boolean;
  onPress: () => void;
  disabledLabel?: string;
}) {
  if (sold) {
    return (
      <View style={[styles.buy, styles.buyOwned]}>
        <Icon name="check" size={16} tint={color.onSuccessContainer} />
        <Text style={styles.buyOwnedText}>{disabledLabel ?? (owned ? 'Owned' : 'Done')}</Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!affordable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.buy,
        affordable ? styles.buyOn : styles.buyOff,
        sink(pressed && affordable, edge.buy),
      ]}
    >
      <Icon name="diamond" size={15} tint={affordable ? '#ffffff' : color.outline} />
      <Text style={[styles.buyText, affordable ? styles.buyTextOn : styles.buyTextOff]}>{price}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 4,
    borderBottomColor: color.surfaceHighest,
    backgroundColor: color.surface,
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, ...type.headline, color: color.onSurface },
  gems: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: '#e8bf3f',
    backgroundColor: color.secondaryContainer,
  },
  gemsText: { ...type.label, color: color.onSecondaryFixed },
  display: { ...type.display, color: color.onSurface },
  sub: { ...type.bodySm, color: color.onSurfaceVariant, marginTop: 4, marginBottom: 22 },
  sectionHead: { ...type.section, color: color.onSurface, marginBottom: 12, marginTop: 8 },
  preview: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: color.outlineVariant,
    borderBottomWidth: edge.card,
    backgroundColor: color.surfaceLow,
    overflow: 'hidden',
  },
  previewTag: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  previewTagText: { ...type.labelSm, fontSize: 13, color: color.onSurfaceVariant },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    padding: 5,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceContainer,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  tabActive: { backgroundColor: color.primaryContainer },
  tabText: { ...type.label, color: color.onSurfaceVariant },
  tabTextActive: { color: color.onPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: {
    width: '31%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    backgroundColor: color.surfaceLowest,
  },
  swatchSelected: { borderColor: color.primaryContainer, backgroundColor: color.primaryWashSoft },
  swatchLocked: { opacity: 0.55 },
  dot: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  swatchName: { ...type.labelSm, color: color.onSurfaceVariant, textAlign: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  priceSmall: { ...type.labelSm, color: color.price },
  shop: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: {
    width: '47%',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    marginBottom: 4,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    borderBottomWidth: edge.card,
    borderBottomColor: color.surfaceHighest,
    backgroundColor: color.surfaceLowest,
  },
  itemArt: {
    width: 84,
    height: 84,
    borderRadius: radius.base,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surfaceLow,
  },
  itemName: { ...type.label, color: color.onSurface, textAlign: 'center' },
  itemNote: { ...type.labelSm, color: color.onSurfaceVariant, textAlign: 'center' },
  buy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
  },
  buyOn: {
    backgroundColor: color.primaryContainer,
    borderBottomWidth: edge.buy,
    borderBottomColor: color.primaryEdge,
  },
  buyOff: { backgroundColor: color.surfaceContainer },
  buyOwned: { backgroundColor: color.successWash },
  buyText: { ...type.label },
  buyTextOn: { color: '#ffffff' },
  buyTextOff: { color: color.outline },
  buyOwnedText: { ...type.label, color: color.onSuccessContainer },
});
