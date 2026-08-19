import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { verifyPin } from '../api/security';
import { PinPad } from '../components/PinPad';
import { useText } from '../i18n/useText';
import { color, space, type } from '../theme';

const MARK = require('../../assets/logo-mark.png');

/**
 * The gate shown before the app itself.
 *
 * A wrong PIN costs a moment: the delay grows with each miss, which is the only
 * brake worth having on a four-digit code — it turns a few seconds of guessing
 * into a much longer sit. It is not a lockout, because locking a learner out of
 * their own streak over a fat-fingered entry would be the worse failure.
 */
export function LockScreen({
  userId,
  onUnlock,
  onForgot,
}: {
  userId: string;
  onUnlock: () => void;
  onForgot: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useText();
  const [error, setError] = useState('');
  const [misses, setMisses] = useState(0);
  const [checking, setChecking] = useState(false);
  const [round, setRound] = useState(0);

  async function submit(pin: string) {
    setChecking(true);
    setError('');

    const ok = await verifyPin(userId, pin);

    if (ok) {
      onUnlock();
      return;
    }

    const next = misses + 1;
    // 0.4s, 0.8s, 1.2s … capped, so a slip is barely felt and a sweep is not
    const wait = Math.min(next * 400, 4000);

    setMisses(next);
    setTimeout(() => {
      setError(next > 2 ? t('pin.wrongCount', { count: next }) : t('pin.wrong'));
      setRound((value) => value + 1);
      setChecking(false);
    }, wait);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.brand}>
        <Image source={MARK} style={{ width: 40, height: 48 }} />
        <Text style={styles.brandText}>PyLearn</Text>
      </View>

      <PinPad
        disabled={checking}
        error={error}
        onComplete={(pin) => void submit(pin)}
        resetKey={round}
        subtitle={t('pin.enter')}
        title={t('pin.welcome')}
      />

      <Pressable hitSlop={10} onPress={onForgot} style={styles.forgot}>
        <Text style={styles.forgotText}>{t('pin.forgot')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.screen,
    backgroundColor: color.surface,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandText: { ...type.display, color: color.primary },
  forgot: { marginTop: space.xs },
  forgotText: { ...type.label, color: color.primary },
});
