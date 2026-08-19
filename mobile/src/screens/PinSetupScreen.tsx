import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '../api/progress';
import { setPin } from '../api/security';
import { PinPad } from '../components/PinPad';
import { useText } from '../i18n/useText';
import { color, space, type } from '../theme';

const MARK = require('../../assets/logo-mark.png');

type Step = 'enter' | 'confirm';

/**
 * Setting the PIN, shown to any signed-in learner who does not have one yet.
 *
 * There is deliberately no skip and no back — that is the point of requiring it.
 * Logging out is still offered, though: without it a learner who changed their
 * mind here would be sealed in, since the profile that holds sign-out sits on
 * the far side of this very gate.
 */
export function PinSetupScreen({
  userId,
  onDone,
  onLogOut,
}: {
  userId: string;
  onDone: () => void;
  onLogOut: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useText();
  const [step, setStep] = useState<Step>('enter');
  const [firstEntry, setFirstEntry] = useState('');
  const [error, setError] = useState('');
  const [round, setRound] = useState(0);

  async function entered(pin: string) {
    if (step === 'enter') {
      // the second pass is what catches a mistyped digit, so the first one is
      // only remembered, never saved
      setFirstEntry(pin);
      setError('');
      setRound((value) => value + 1);
      setStep('confirm');
      return;
    }

    if (pin !== firstEntry) {
      setFirstEntry('');
      setError(t('pin.mismatch'));
      setRound((value) => value + 1);
      setStep('enter');
      return;
    }

    try {
      await setPin(userId, pin);
      onDone();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
      setRound((value) => value + 1);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.brand}>
        <Image source={MARK} style={{ width: 40, height: 48 }} />
        <Text style={styles.brandText}>PyLearn</Text>
      </View>

      <PinPad
        error={error}
        onComplete={(pin) => void entered(pin)}
        resetKey={round}
        subtitle={step === 'enter' ? t('pin.protectSub') : t('pin.confirmSub')}
        title={step === 'enter' ? t('pin.protect') : t('pin.confirm')}
      />


      <View style={styles.steps}>
        <View style={[styles.stepDot, styles.stepDotOn]} />
        <View style={[styles.stepDot, step === 'confirm' ? styles.stepDotOn : null]} />
      </View>

      <Pressable hitSlop={10} onPress={onLogOut} style={styles.out}>
        <Text style={styles.outText}>{t('pin.logOutInstead')}</Text>
      </Pressable>
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
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandText: { ...type.display, color: color.primary },
  steps: { flexDirection: 'row', gap: 8, marginTop: space.xs },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.surfaceHighest },
  stepDotOn: { width: 22, backgroundColor: color.primaryContainer },
  out: { marginTop: 4 },
  outText: { ...type.label, color: color.onSurfaceVariant },
});
