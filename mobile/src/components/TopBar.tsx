import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, space, type } from '../theme';
import type { State } from '../state/store';
import { Icon } from './ui';

export function TopBar({ state, onGems }: { state: State; onGems?: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top, height: 68 + insets.top }]}>
      <Stat icon="local-fire-department" tint={color.streak} value={state.streak} label={`${state.streak}-day streak`} />
      {/* gems, not XP: XP is the score and never goes down, gems are the wallet */}
      <Stat icon="diamond" tint={color.tertiary} value={state.gems} label="Open the shop" onPress={onGems} />
      <Stat icon="favorite" tint={color.error} value={state.hearts} label={`${state.hearts} hearts left`} />
    </View>
  );
}

function Stat({
  icon,
  tint,
  value,
  label,
  onPress,
}: {
  icon: string;
  tint: string;
  value: number;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.stat}>
      <Icon name={icon} size={24} tint={tint} />
      <Text style={[styles.value, { color: tint }]}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.sm,
    borderBottomWidth: 4,
    borderBottomColor: color.surfaceHighest,
    backgroundColor: color.surface,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  value: {
    ...type.label,
    fontSize: 15,
  },
});
