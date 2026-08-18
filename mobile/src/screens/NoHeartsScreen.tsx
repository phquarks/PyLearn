import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buyHearts, getErrorMessage } from '../api/progress';
import { HEART_REFILL_PRICE } from '../data/cosmetics';
import { FREE_UNITS, units } from '../data/lessons';
import { ChunkyButton, Icon, Note } from '../components/ui';
import type { Action, State } from '../state/store';
import { color, radius, space, type } from '../theme';

/** mm:ss left, or '' once the moment has passed */
function countdown(target: string, now: number) {
  if (!target) return '';

  const left = new Date(target).getTime() - now;

  if (left <= 0) return '';

  const minutes = Math.floor(left / 60000);
  const seconds = Math.floor((left % 60000) / 1000);

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Shown when a wrong answer takes the last heart.
 *
 * It has to answer one question honestly: what now? Waiting is the default and
 * is given a real number rather than a vague "come back later"; the shop is
 * offered only when it can actually be afforded, because a price you cannot pay
 * is not a choice; and the early units stay open, so there is always something
 * to do that costs nothing.
 */
export function NoHeartsScreen({
  state,
  dispatch,
  onRefreshed,
}: {
  state: State;
  dispatch: (action: Action) => void;
  onRefreshed: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(timer);
  }, []);

  const left = countdown(state.heartsNextAt, now);

  // the moment the clock runs out, ask the server rather than guessing
  useEffect(() => {
    if (state.heartsNextAt && !left) onRefreshed();
  }, [left, state.heartsNextAt, onRefreshed]);

  const canAfford = state.gems >= HEART_REFILL_PRICE;
  const freeUnitNames = units
    .filter((unit) => unit.id <= FREE_UNITS)
    .map((unit) => unit.title)
    .join(' and ');

  async function refill() {
    setBusy(true);
    setError('');

    try {
      const result = await buyHearts();
      dispatch({ type: 'APPLY_HEARTS', hearts: result.hearts, nextAt: '', gems: result.gems });
      dispatch({ type: 'GO_TO', screen: 'home' });
    } catch (buyError) {
      setError(getErrorMessage(buyError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.badge}>
        <Icon name="favorite-border" size={46} tint={color.error} />
      </View>

      <Text style={styles.title}>Out of hearts</Text>
      <Text style={styles.text}>
        {left
          ? 'One comes back every half hour. The next is on its way.'
          : 'A heart should be back by now — checking.'}
      </Text>

      {left ? (
        <View style={styles.clock}>
          <Icon name="schedule" size={20} tint={color.onSurfaceVariant} />
          <Text style={styles.clockText}>{left}</Text>
        </View>
      ) : null}

      {error ? <Note tone="error">{error}</Note> : null}

      <View style={styles.actions}>
        <ChunkyButton
          disabled={!canAfford || busy}
          icon="favorite"
          label={busy ? 'Buying...' : `Refill for ${HEART_REFILL_PRICE} gems`}
          onPress={() => void refill()}
          style={{ alignSelf: 'stretch' }}
        />
        {canAfford ? null : (
          <Text style={styles.hint}>
            You have {state.gems} of the {HEART_REFILL_PRICE} gems a refill costs.
          </Text>
        )}

        <ChunkyButton
          icon="school"
          label="Practise for free"
          onPress={() => dispatch({ type: 'GO_TO', screen: 'home' })}
          style={{ alignSelf: 'stretch' }}
          tone="ghost"
        />
        <Text style={styles.hint}>
          {freeUnitNames} cost no hearts, so you can keep going there while these come back.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: space.screen,
    backgroundColor: color.surface,
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.errorContainer,
  },
  title: { ...type.display, color: color.onSurface, textAlign: 'center', marginTop: space.sm },
  text: { ...type.body, color: color.onSurfaceVariant, textAlign: 'center' },
  clock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: space.xs,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceContainer,
  },
  clockText: {
    ...type.title,
    color: color.onSurface,
    fontVariant: ['tabular-nums'],
  },
  actions: { alignSelf: 'stretch', gap: 10, marginTop: space.md },
  hint: { ...type.labelSm, color: color.onSurfaceVariant, textAlign: 'center' },
});
