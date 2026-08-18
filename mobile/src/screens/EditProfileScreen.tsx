import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteAccount, updateEmail } from '../api/auth';
import { clearAvatar, pickAvatar } from '../api/avatar';
import { getErrorMessage } from '../api/progress';
import { hasPin, setPin } from '../api/security';
import { PinPad } from '../components/PinPad';
import { ChunkyButton, Icon, Note } from '../components/ui';
import type { Action, State } from '../state/store';
import { color, radius, space, type } from '../theme';

const MARK = require('../../assets/logo-mark.png');

/** which PIN step the sheet is on; 'off' means the sheet is closed */
type PinStep = 'off' | 'enter' | 'confirm';

export function EditProfileScreen({
  state,
  dispatch,
  userEmail,
  userId,
  onDeleted,
  onPinChanged,
}: {
  state: State;
  dispatch: (action: Action) => void;
  userEmail: string;
  userId: string;
  /** clears the local session state once the account is gone */
  onDeleted: () => void;
  /** lets App re-read whether a PIN exists, so the lock gate stays in step */
  onPinChanged: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState(userEmail);
  const [pinSet, setPinSet] = useState(false);
  const [step, setStep] = useState<PinStep>('off');
  const [firstEntry, setFirstEntry] = useState('');
  const [pinError, setPinError] = useState('');
  const [round, setRound] = useState(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    void hasPin().then(setPinSet);
  }, []);

  async function choosePicture() {
    setError('');

    try {
      const picked = await pickAvatar(userId);

      if (picked.uri) {
        dispatch({ type: 'SET_AVATAR', uri: picked.uri, url: picked.url });
        setNote('Picture updated. Other learners will see it in the League.');
      }
    } catch (pickError) {
      setError(getErrorMessage(pickError));
    }
  }

  async function removePicture() {
    await clearAvatar();
    dispatch({ type: 'SET_AVATAR', uri: '', url: '' });
    setNote('Picture removed.');
  }

  async function saveEmail() {
    const next = email.trim();

    if (next === userEmail) {
      setError('That is already your email.');
      return;
    }

    setBusy(true);
    setError('');
    setNote('');

    try {
      await updateEmail(next);
      setNote('Check the new address and follow the link to finish the change.');
    } catch (mailError) {
      setError(getErrorMessage(mailError));
    } finally {
      setBusy(false);
    }
  }

  async function removeAccount() {
    setBusy(true);
    setError('');

    try {
      await deleteAccount();
      // the session is gone; App notices and returns to the welcome screens
      onDeleted();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
      setBusy(false);
    }
  }

  function openPinSheet() {
    setFirstEntry('');
    setPinError('');
    setRound((value) => value + 1);
    setStep('enter');
  }

  async function onPinEntered(pin: string) {
    if (step === 'enter') {
      // the second pass is what catches a mistyped digit, so the first one is
      // only remembered, never saved
      setFirstEntry(pin);
      setPinError('');
      setRound((value) => value + 1);
      setStep('confirm');
      return;
    }

    if (pin !== firstEntry) {
      setFirstEntry('');
      setPinError('Those did not match. Start again.');
      setRound((value) => value + 1);
      setStep('enter');
      return;
    }

    try {
      await setPin(pin);
      setPinSet(true);
      onPinChanged();
      setStep('off');
      setNote('PIN saved. It will be asked for next time the app opens.');
    } catch (pinSaveError) {
      setPinError(getErrorMessage(pinSaveError));
      setRound((value) => value + 1);
    }
  }

  if (step !== 'off') {
    return (
      <View style={[styles.sheet, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        <PinPad
          error={pinError}
          onComplete={(pin) => void onPinEntered(pin)}
          resetKey={round}
          subtitle={
            step === 'enter'
              ? 'Pick four digits. You will type them again to confirm.'
              : 'Type the same four digits once more.'
          }
          title={step === 'enter' ? 'Choose a PIN' : 'Confirm your PIN'}
        />

        <Pressable hitSlop={10} onPress={() => setStep('off')} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          padding: space.screen,
          paddingTop: insets.top + 64,
          paddingBottom: insets.bottom + 40,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.display}>Edit profile</Text>

        <View style={styles.avatarRow}>
          <Pressable accessibilityRole="button" onPress={() => void choosePicture()} style={styles.avatar}>
            {state.avatarUri ? (
              <Image source={{ uri: state.avatarUri }} style={styles.avatarImage} />
            ) : (
              <Image source={MARK} style={{ width: 54, height: 65 }} />
            )}
            <View style={styles.avatarBadge}>
              <Icon name="photo-camera" size={16} tint={color.onPrimary} />
            </View>
          </Pressable>

          <View style={styles.avatarSide}>
            <Text style={styles.sectionHead}>Picture</Text>
            <Text style={styles.hint}>Shown next to your name in the League.</Text>
            {state.avatarUri ? (
              <Pressable hitSlop={8} onPress={() => void removePicture()}>
                <Text style={styles.link}>Remove picture</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {state.profileHidden ? (
          <Note tone="error">
            A moderator removed your name and picture from the League. Your progress is untouched.
            Write to us if you think that was a mistake.
          </Note>
        ) : null}
        {note ? <Note>{note}</Note> : null}
        {error ? <Note tone="error">{error}</Note> : null}

        <Text style={styles.sectionHead}>Name</Text>
        <View style={styles.field}>
          <Icon name="person-outline" size={20} tint={color.outline} />
          <TextInput
            maxLength={24}
            onChangeText={(name) => dispatch({ type: 'SET_DISPLAY_NAME', name })}
            placeholder="Your name"
            placeholderTextColor={color.outline}
            style={styles.fieldInput}
            value={state.displayName}
          />
        </View>
        <Text style={styles.hint}>This is the name other learners see in the League.</Text>

        <Text style={styles.sectionHead}>Email</Text>
        <View style={styles.field}>
          <Icon name="mail-outline" size={20} tint={color.outline} />
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={color.outline}
            style={styles.fieldInput}
            value={email}
          />
        </View>
        <ChunkyButton
          disabled={busy || !email.trim() || email.trim() === userEmail}
          label={busy ? 'Sending...' : 'Change email'}
          onPress={() => void saveEmail()}
          style={{ alignSelf: 'stretch', marginTop: 10 }}
          tone="ghost"
        />
        <Text style={styles.hint}>
          The address only changes once you follow the link we send to the new one.
        </Text>

        <Text style={styles.sectionHead}>PIN</Text>
        <View style={styles.pinRow}>
          <Icon name={pinSet ? 'lock' : 'lock-open'} size={22} tint={pinSet ? color.primary : color.outline} />
          <Text style={styles.pinState}>{pinSet ? 'PIN is on' : 'No PIN yet'}</Text>
        </View>
        <Text style={styles.hint}>
          Required, and asked for each time the app opens. It locks this phone, not the account —
          signing in elsewhere still needs your password.
        </Text>

        <ChunkyButton
          label={pinSet ? 'Change PIN' : 'Set a PIN'}
          onPress={openPinSheet}
          style={{ alignSelf: 'stretch', marginTop: 10 }}
        />


        <Text style={styles.sectionHead}>Delete account</Text>
        {confirmingDelete ? (
          <>
            <Text style={styles.hint}>
              This removes your account, your XP and streak, every finished lesson, your gems and
              what you bought with them, and your picture. It cannot be undone and nothing is kept.
            </Text>
            <ChunkyButton
              disabled={busy}
              icon="delete-forever"
              label={busy ? 'Deleting...' : 'Yes, delete everything'}
              onPress={() => void removeAccount()}
              style={{ alignSelf: 'stretch', marginTop: 10 }}
              tone="danger"
            />
            <ChunkyButton
              disabled={busy}
              label="Keep my account"
              onPress={() => setConfirmingDelete(false)}
              style={{ alignSelf: 'stretch', marginTop: 10 }}
              tone="ghost"
            />
          </>
        ) : (
          <>
            <Text style={styles.hint}>
              Leaves for good and takes your progress with it.
            </Text>
            <ChunkyButton
              icon="delete-outline"
              label="Delete my account"
              onPress={() => setConfirmingDelete(true)}
              style={{ alignSelf: 'stretch', marginTop: 10 }}
              tone="ghost"
            />
          </>
        )}

        <ChunkyButton
          icon="arrow-back"
          label="Back to profile"
          onPress={() => dispatch({ type: 'GO_TO', screen: 'profile' })}
          style={{ alignSelf: 'stretch', marginTop: space.md }}
          tone="ghost"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  sheet: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingHorizontal: space.screen,
    backgroundColor: color.surface,
  },
  cancel: { marginTop: space.xs },
  cancelText: { ...type.label, color: color.onSurfaceVariant },
  display: { ...type.display, color: color.onSurface, marginBottom: space.sm },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surfaceContainer,
    borderWidth: 3,
    borderColor: color.surfaceLowest,
    overflow: 'visible',
  },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.primaryContainer,
    borderWidth: 2,
    borderColor: color.surface,
  },
  avatarSide: { flex: 1, gap: 2 },
  sectionHead: { ...type.section, color: color.onSurface, marginTop: space.sm },
  hint: { ...type.bodySm, color: color.onSurfaceVariant, marginTop: 6 },
  link: { ...type.label, color: color.primary, marginTop: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 14,
    minHeight: 56,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    backgroundColor: color.surfaceLowest,
  },
  fieldInput: { ...type.body, flex: 1, color: color.onSurface, paddingVertical: 12 },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    padding: 14,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    backgroundColor: color.surfaceLowest,
  },
  toggleText: { flex: 1 },
  pinState: { ...type.label, color: color.onSurface },
});
