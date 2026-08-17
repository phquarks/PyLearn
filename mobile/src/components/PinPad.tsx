import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PIN_LENGTH } from '../api/security';
import { color, radius, space, type } from '../theme';
import { Icon } from './ui';

/**
 * A digit pad that reports a completed PIN and then empties itself.
 *
 * It holds no opinion about what the PIN is for — entering, confirming and
 * re-entering are all the same screen from here. The caller drives the sequence
 * by changing the title and bumping `resetKey`, which is also how a mismatch
 * sends the learner back to a blank pad.
 *
 * There is no system keyboard on purpose: a pad keeps the digits out of the
 * keyboard's own autocorrect and clipboard history.
 */
export function PinPad({
  title,
  subtitle,
  error,
  onComplete,
  resetKey = 0,
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  error?: string;
  onComplete: (pin: string) => void;
  resetKey?: number;
  disabled?: boolean;
}) {
  const [pin, setPin] = useState('');
  const shake = useSharedValue(0);

  useEffect(() => {
    setPin('');
  }, [resetKey]);

  // a wrong PIN is felt before it is read, so the row moves the moment the
  // message appears rather than waiting for the learner to look down
  useEffect(() => {
    if (!error) return;

    shake.value = withSequence(
      withTiming(-9, { duration: 55 }),
      withTiming(9, { duration: 55 }),
      withTiming(-6, { duration: 55 }),
      withTiming(6, { duration: 55 }),
      withTiming(0, { duration: 55 }),
    );
  }, [error, shake]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  function press(key: string) {
    if (disabled) return;

    if (key === 'del') {
      setPin((current) => current.slice(0, -1));
      return;
    }

    setPin((current) => {
      if (current.length >= PIN_LENGTH) return current;

      const next = current + key;

      // handing the finished PIN over on the same tap that completes it, rather
      // than making the learner reach for a separate confirm button
      if (next.length === PIN_LENGTH) onComplete(next);

      return next;
    });
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <Animated.View style={[styles.dots, shakeStyle]}>
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <Dot filled={index < pin.length} key={index} wrong={Boolean(error)} />
        ))}
      </Animated.View>

      <Text style={[styles.error, error ? null : styles.errorHidden]}>{error || ' '}</Text>

      <View style={styles.pad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
          <Key digit={key} disabled={disabled} key={key} onPress={press} />
        ))}

        <View style={[styles.key, styles.keyBlank]} />

        <Key digit="0" disabled={disabled} onPress={press} />

        <Pressable
          accessibilityLabel="Delete last digit"
          accessibilityRole="button"
          disabled={disabled || pin.length === 0}
          onPress={() => press('del')}
          style={({ pressed }) => [styles.key, styles.keyGhost, pressed ? styles.keySunk : null]}
        >
          <Icon
            name="backspace"
            size={24}
            tint={pin.length ? color.onSurfaceVariant : color.outlineVariant}
          />
        </Pressable>
      </View>
    </View>
  );
}

/** one entry marker; it pops as it fills so the tap is confirmed without sound */
function Dot({ filled, wrong }: { filled: boolean; wrong: boolean }) {
  const grow = useSharedValue(0);

  useEffect(() => {
    grow.value = withSpring(filled ? 1 : 0, { damping: 12, stiffness: 260, mass: 0.5 });
  }, [filled, grow]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.72 + grow.value * 0.28 }],
    opacity: 0.35 + grow.value * 0.65,
  }));

  return (
    <Animated.View
      style={[styles.dot, filled ? styles.dotFilled : null, wrong ? styles.dotWrong : null, style]}
    />
  );
}

function Key({
  digit,
  onPress,
  disabled,
}: {
  digit: string;
  onPress: (key: string) => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={digit}
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => onPress(digit)}
      style={({ pressed }) => [styles.key, styles.keySolid, pressed ? styles.keySunk : null]}
    >
      <Text style={styles.keyText}>{digit}</Text>
    </Pressable>
  );
}

const KEY_SIZE = 76;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', alignSelf: 'stretch' },
  title: { ...type.display, color: color.onSurface, textAlign: 'center' },
  subtitle: {
    ...type.bodySm,
    color: color.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: space.sm,
  },
  dots: { flexDirection: 'row', gap: 18, marginTop: space.md, height: 22, alignItems: 'center' },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: color.outlineVariant,
  },
  dotFilled: { backgroundColor: color.primaryContainer, borderColor: color.primaryContainer },
  dotWrong: { backgroundColor: color.error, borderColor: color.error },
  // the row is always present so the pad does not jump when a message appears
  error: { ...type.label, color: color.error, marginTop: 14, textAlign: 'center' },
  errorHidden: { opacity: 0 },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginTop: space.sm,
    width: KEY_SIZE * 3 + 28,
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // the same isometric language the rest of the app uses: a solid bottom edge
  // that disappears as the key is pushed down
  keySolid: {
    backgroundColor: color.surfaceLowest,
    borderWidth: 2,
    borderColor: color.surfaceHigh,
    borderBottomWidth: 5,
    borderBottomColor: color.surfaceHighest,
  },
  keyGhost: { backgroundColor: 'transparent' },
  keyBlank: { opacity: 0 },
  keySunk: {
    backgroundColor: color.primaryWashSoft,
    borderBottomWidth: 2,
    marginTop: 3,
    marginBottom: -3,
  },
  keyText: { ...type.display, fontSize: 30, color: color.onSurface },
});
