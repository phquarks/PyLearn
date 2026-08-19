import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, Switch, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteAccount, updateEmail } from '../api/auth';
import { clearAvatar, pickAvatar } from '../api/avatar';
import { getErrorMessage } from '../api/progress';
import DateTimePicker from '@react-native-community/datetimepicker';

import { formatTime, MAX_TIMES, parseTime } from '../api/reminders';
import { clearPin, hasPin, setPin } from '../api/security';
import { PinPad } from '../components/PinPad';
import { ChunkyButton, Icon, Note } from '../components/ui';
import { useText } from '../i18n/useText';
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
  onReminders,
  onDeleted,
  onPinChanged,
}: {
  state: State;
  dispatch: (action: Action) => void;
  userEmail: string;
  userId: string;
  /** saves the choice, asks the system for permission, rebuilds the queue */
  onReminders: (on: boolean, times: string[]) => void;
  /** clears the local session state once the account is gone */
  onDeleted: () => void;
  /** lets App re-read whether a PIN exists, so the lock gate stays in step */
  onPinChanged: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { t, language, setLanguage } = useText();
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
  const [addingTime, setAddingTime] = useState(false);

  useEffect(() => {
    void hasPin(userId).then(setPinSet);
  }, [userId]);

  async function choosePicture() {
    setError('');

    try {
      const picked = await pickAvatar(userId);

      if (picked.uri) {
        dispatch({ type: 'SET_AVATAR', uri: picked.uri, url: picked.url });
        setNote(t('edit.pictureUpdated'));
      }
    } catch (pickError) {
      setError(getErrorMessage(pickError));
    }
  }

  async function removePicture() {
    await clearAvatar();
    dispatch({ type: 'SET_AVATAR', uri: '', url: '' });
    setNote(t('edit.pictureRemoved'));
  }

  async function saveEmail() {
    const next = email.trim();

    if (next === userEmail) {
      setError(t('edit.emailSame'));
      return;
    }

    setBusy(true);
    setError('');
    setNote('');

    try {
      await updateEmail(next);
      setNote(t('edit.emailSent'));
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
      // the account is gone, so its PIN has nothing left to guard
      await clearPin(userId);
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
      setPinError(t('pin.mismatch'));
      setRound((value) => value + 1);
      setStep('enter');
      return;
    }

    try {
      await setPin(userId, pin);
      setPinSet(true);
      onPinChanged();
      setStep('off');
      setNote(t('edit.pinSaved'));
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
          subtitle={step === 'enter' ? t('pin.protectSub') : t('pin.confirmSub')}
          title={step === 'enter' ? t('pin.protect') : t('pin.confirm')}
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
        <Text style={styles.display}>{t('edit.title')}</Text>

        <View style={styles.avatarRow}>
          <Pressable accessibilityRole="button" onPress={() => void choosePicture()} style={styles.avatar}>
            {state.avatarUri || state.avatarUrl ? (
              <Image
                source={{ uri: state.avatarUri || state.avatarUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <Image source={MARK} style={{ width: 54, height: 65 }} />
            )}
            <View style={styles.avatarBadge}>
              <Icon name="photo-camera" size={16} tint={color.onPrimary} />
            </View>
          </Pressable>

          <View style={styles.avatarSide}>
            <Text style={styles.sectionHead}>{t('edit.picture')}</Text>
            <Text style={styles.hint}>{t('edit.pictureHint')}</Text>
            {state.avatarUri || state.avatarUrl ? (
              <Pressable hitSlop={8} onPress={() => void removePicture()}>
                <Text style={styles.link}>{t('edit.removePicture')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {state.profileHidden ? (
          <Note tone="error">
            {t('edit.hidden')}
          </Note>
        ) : null}
        {note ? <Note>{note}</Note> : null}
        {error ? <Note tone="error">{error}</Note> : null}

        <Text style={styles.sectionHead}>{t('edit.name')}</Text>
        <View style={styles.field}>
          <Icon name="person-outline" size={20} tint={color.outline} />
          <TextInput
            maxLength={24}
            onChangeText={(name) => dispatch({ type: 'SET_DISPLAY_NAME', name })}
            placeholder={t('edit.namePlaceholder')}
            placeholderTextColor={color.outline}
            style={styles.fieldInput}
            value={state.displayName}
          />
        </View>
        <Text style={styles.hint}>{t('edit.nameHint')}</Text>

        <Text style={styles.sectionHead}>{t('edit.email')}</Text>
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
          label={busy ? t('edit.sending') : t('edit.changeEmail')}
          onPress={() => void saveEmail()}
          style={{ alignSelf: 'stretch', marginTop: 10 }}
          tone="ghost"
        />
        <Text style={styles.hint}>
          {t('edit.emailHint')}
        </Text>

        <Text style={styles.sectionHead}>{t('edit.pin')}</Text>
        <View style={styles.pinRow}>
          <Icon name={pinSet ? 'lock' : 'lock-open'} size={22} tint={pinSet ? color.primary : color.outline} />
          <Text style={styles.pinState}>{pinSet ? t('edit.pinOn') : t('edit.pinOff')}</Text>
        </View>
        <Text style={styles.hint}>
          {t('edit.pinHint')}
        </Text>

        <ChunkyButton
          label={pinSet ? t('edit.changePin') : t('edit.setPin')}
          onPress={openPinSheet}
          style={{ alignSelf: 'stretch', marginTop: 10 }}
        />


        <Text style={styles.sectionHead}>{t('edit.reminders')}</Text>
        <View style={styles.toggleRow}>
          <Icon
            name={state.remindersOn ? 'notifications-active' : 'notifications-off'}
            size={22}
            tint={state.remindersOn ? color.primary : color.outline}
          />
          <View style={styles.toggleText}>
            <Text style={styles.pinState}>
              {state.remindersOn ? t('edit.remindersOn') : t('edit.remindersOff')}
            </Text>
            <Text style={styles.hint}>{t('edit.remindersHint')}</Text>
          </View>
          <Switch
            onValueChange={(next) => onReminders(next, state.reminderTimes)}
            thumbColor={color.surfaceLowest}
            trackColor={{ false: color.surfaceHighest, true: color.primaryContainer }}
            value={state.remindersOn}
          />
        </View>

        {state.remindersOn ? (
          <>
            {state.reminderTimes.map((value) => (
              <View key={value} style={styles.timeRow}>
                <Icon name="schedule" size={20} tint={color.onSurfaceVariant} />
                <Text style={styles.timeValue}>{value}</Text>
                {/* the last one cannot go: reminders on with no time would be a
                    switch that promises something and does nothing */}
                {state.reminderTimes.length > 1 ? (
                  <Pressable
                    accessibilityLabel={`Remove the ${value} reminder`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() =>
                      onReminders(
                        true,
                        state.reminderTimes.filter((entry) => entry !== value),
                      )
                    }
                  >
                    <Icon name="close" size={20} tint={color.outline} />
                  </Pressable>
                ) : null}
              </View>
            ))}

            {state.reminderTimes.length < MAX_TIMES ? (
              <ChunkyButton
                icon={addingTime ? 'check' : 'add'}
                label={addingTime ? t('edit.doneAdding') : t('edit.addTime')}
                onPress={() => setAddingTime((open) => !open)}
                style={{ alignSelf: 'stretch', marginTop: 10 }}
                tone="ghost"
              />
            ) : (
              <Text style={styles.hint}>{t('edit.timesFull')}</Text>
            )}

            {addingTime ? (
              <DateTimePicker
                display="spinner"
                mode="time"
                onChange={(_event, picked) => {
                  if (!picked) return;

                  /* Saved on every turn of the wheel: the queue is cheap to
                     rebuild, and duplicates are dropped when the list is tidied,
                     so scrolling past a time already on the list costs nothing. */
                  const value = formatTime(picked.getHours(), picked.getMinutes());
                  onReminders(true, [...state.reminderTimes, value]);
                }}
                value={(() => {
                  const last = parseTime(state.reminderTimes[state.reminderTimes.length - 1] ?? '');
                  const at = new Date();
                  at.setHours(last?.hour ?? 19, last?.minute ?? 0, 0, 0);

                  return at;
                })()}
              />
            ) : null}

            <Text style={styles.hint}>
              {state.reminderTimes.length === 1
                ? t('edit.oneADay')
                : t('edit.manyADay', { count: state.reminderTimes.length })}
            </Text>
          </>
        ) : null}

        <Text style={styles.sectionHead}>{t('edit.language')}</Text>
        <View style={styles.hours}>
          {(['ru', 'en'] as const).map((code) => {
            const picked = language === code;

            return (
              <Pressable
                key={code}
                onPress={() => setLanguage(code)}
                style={[styles.hour, picked ? styles.hourPicked : null]}
              >
                <Text style={[styles.hourText, picked ? styles.hourTextPicked : null]}>
                  {code === 'ru' ? 'Русский' : 'English'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>{t('edit.languageHint')}</Text>

        <Text style={styles.sectionHead}>{t('edit.deleteTitle')}</Text>
        {confirmingDelete ? (
          <>
            <Text style={styles.hint}>
              {t('edit.deleteWarning')}
            </Text>
            <ChunkyButton
              disabled={busy}
              icon="delete-forever"
              label={busy ? t('edit.deleting') : t('edit.deleteConfirm')}
              onPress={() => void removeAccount()}
              style={{ alignSelf: 'stretch', marginTop: 10 }}
              tone="danger"
            />
            <ChunkyButton
              disabled={busy}
              label={t('edit.deleteCancel')}
              onPress={() => setConfirmingDelete(false)}
              style={{ alignSelf: 'stretch', marginTop: 10 }}
              tone="ghost"
            />
          </>
        ) : (
          <>
            <Text style={styles.hint}>
              {t('edit.deleteHint')}
            </Text>
            <ChunkyButton
              icon="delete-outline"
              label={t('edit.deleteAsk')}
              onPress={() => setConfirmingDelete(true)}
              style={{ alignSelf: 'stretch', marginTop: 10 }}
              tone="ghost"
            />
          </>
        )}

        <ChunkyButton
          icon="arrow-back"
          label={t('edit.back')}
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
  hours: { flexDirection: 'row', gap: 8, marginTop: 12 },
  hour: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    backgroundColor: color.surfaceLowest,
  },
  hourPicked: { borderColor: color.primaryContainer, backgroundColor: color.primaryWashSoft },
  hourText: { ...type.label, color: color.onSurfaceVariant },
  hourTextPicked: { color: color.onPrimaryContainer },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 14,
    minHeight: 56,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    backgroundColor: color.surfaceLowest,
  },
  timeValue: {
    ...type.title,
    flex: 1,
    fontSize: 20,
    color: color.onSurface,
    fontVariant: ['tabular-nums'],
  },
  pinState: { ...type.label, color: color.onSurface },
});
