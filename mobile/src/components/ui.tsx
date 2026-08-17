import { MaterialIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { color, edge, radius, space, type } from '../theme';

/**
 * The web build draws isometric depth with a zero-blur box-shadow. React Native
 * has no such shadow, so the same silhouette is a solid bottom border that the
 * object loses as it sinks — the press keeps its total height constant by
 * taking on the removed border as margin.
 */
export function sink(pressed: boolean, depth: number) {
  return pressed
    ? { borderBottomWidth: 0, marginTop: depth, marginBottom: 0 }
    : { borderBottomWidth: depth, marginTop: 0, marginBottom: 0 };
}

export function Icon({
  name,
  size = 24,
  tint = color.onSurface,
}: {
  name: string;
  size?: number;
  tint?: string;
}) {
  return <MaterialIcons color={tint} name={name as never} size={size} />;
}

type ButtonTone = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';

const tones: Record<ButtonTone, { bg: string; edge: string; label: string }> = {
  primary: { bg: color.primaryContainer, edge: color.primaryEdge, label: '#ffffff' },
  secondary: { bg: color.secondaryContainer, edge: color.secondaryEdge, label: color.onSecondaryFixed },
  tertiary: { bg: color.tertiaryContainer, edge: color.tertiaryEdge, label: color.onTertiaryContainer },
  danger: { bg: color.error, edge: '#8c1212', label: '#ffffff' },
  ghost: { bg: color.surfaceLowest, edge: color.surfaceHighest, label: color.onSurfaceVariant },
};

export function ChunkyButton({
  label,
  onPress,
  tone = 'primary',
  disabled = false,
  icon,
  style,
}: {
  label: string;
  onPress?: () => void;
  tone?: ButtonTone;
  disabled?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const skin = tones[tone];
  const bg = disabled ? color.surfaceHighest : skin.bg;
  const edgeColor = disabled ? color.surfaceDim : skin.edge;
  const label_ = disabled ? '#8a929c' : skin.label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderBottomColor: edgeColor },
        tone === 'ghost' ? styles.buttonGhost : null,
        sink(pressed && !disabled, edge.button),
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={20} tint={label_} /> : null}
      <Text style={[styles.buttonLabel, { color: label_ }]}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

/** an honest marker on anything that is presentation only */
export function Note({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' }) {
  const bad = tone === 'error';

  return (
    <View style={[styles.note, bad ? styles.noteError : null]}>
      <Icon name={bad ? 'error-outline' : 'info-outline'} size={18} tint={bad ? color.error : color.onSurfaceVariant} />
      <Text style={[styles.noteText, bad ? styles.noteErrorText : null]}>{children}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    minHeight: 52,
    paddingHorizontal: space.screen,
    borderRadius: radius.base,
    borderBottomWidth: edge.button,
  },
  buttonGhost: {
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    borderBottomWidth: edge.button,
  },
  buttonLabel: {
    ...type.label,
    letterSpacing: 0.4,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.xs,
    marginBottom: 18,
    padding: 12,
    borderRadius: radius.base,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: color.outlineVariant,
  },
  noteError: { borderStyle: 'solid', borderColor: color.error, backgroundColor: color.errorContainer },
  noteErrorText: { color: color.onErrorContainer },
  noteText: {
    flex: 1,
    ...type.labelSm,
    fontSize: 13,
    lineHeight: 18,
    color: color.onSurfaceVariant,
  },
  card: {
    padding: space.sm,
    borderRadius: radius.base,
    borderWidth: 2,
    borderBottomWidth: edge.card,
    borderColor: color.surfaceHighest,
    backgroundColor: color.surfaceLowest,
  },
});
