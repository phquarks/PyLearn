import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChunkyButton, Icon } from '../components/ui';
import { useText } from '../i18n/useText';
import { color, space, type } from '../theme';

/**
 * Shown to an account an admin has blocked.
 *
 * This screen is a courtesy, not the enforcement: the block lives in the
 * database, where every function that grants or spends anything refuses to run
 * for a blocked account. Getting past this screen would gain nothing.
 *
 * It says why where a reason was given, because "blocked" with no explanation
 * is the kind of dead end that turns a mistake into a lost learner.
 */
export function BlockedScreen({ reason, onSignOut }: { reason: string; onSignOut: () => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useText();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.badge}>
        <Icon name="block" size={44} tint={color.error} />
      </View>

      <Text style={styles.title}>{t('blocked.title')}</Text>
      <Text style={styles.text}>
        {reason || t('blocked.text')}
      </Text>
      <Text style={styles.small}>
        {t('blocked.kept')}
      </Text>

      <ChunkyButton
        icon="logout"
        label={t('profile.signOut')}
        onPress={onSignOut}
        style={{ alignSelf: 'stretch', marginTop: space.md }}
        tone="ghost"
      />
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
  small: { ...type.bodySm, color: color.outline, textAlign: 'center', marginTop: space.xs },
});
