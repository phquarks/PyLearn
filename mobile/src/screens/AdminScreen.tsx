import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { grantGems } from '../api/admin';
import { getErrorMessage } from '../api/progress';
import { ChunkyButton, Icon, Note } from '../components/ui';
import type { Action } from '../state/store';
import { color, radius, space, type } from '../theme';

const QUICK = [50, 100, 250, 500];

type Entry = { email: string; amount: number; total: number };

/**
 * Handing gems to an account by email.
 *
 * The screen is only reachable when the database says the caller is an admin,
 * and every button here goes through a function that asks the same question
 * again on the server. Reaching this screen by other means buys nothing.
 */
export function AdminScreen({ dispatch }: { dispatch: (action: Action) => void }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('100');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [log, setLog] = useState<Entry[]>([]);

  const parsed = Number.parseInt(amount, 10);
  const valid = email.trim().includes('@') && Number.isFinite(parsed) && parsed !== 0;

  async function send(signed: number) {
    setBusy(true);
    setError('');

    try {
      const result = await grantGems(email, signed);

      setLog((current) => [{ email: result.email, amount: signed, total: result.gems }, ...current].slice(0, 8));
    } catch (grantError) {
      setError(getErrorMessage(grantError));
    } finally {
      setBusy(false);
    }
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
        <Text style={styles.display}>Admin</Text>
        <Text style={styles.sub}>Grant gems to an account by its email address.</Text>

        {error ? <Note tone="error">{error}</Note> : null}

        <Text style={styles.sectionHead}>Account</Text>
        <View style={styles.field}>
          <Icon name="mail-outline" size={20} tint={color.outline} />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="learner@example.com"
            placeholderTextColor={color.outline}
            style={styles.fieldInput}
            value={email}
          />
        </View>

        <Text style={styles.sectionHead}>Amount</Text>
        <View style={styles.field}>
          <Icon name="diamond" size={20} tint={color.price} />
          <TextInput
            keyboardType="number-pad"
            onChangeText={setAmount}
            placeholder="100"
            placeholderTextColor={color.outline}
            style={styles.fieldInput}
            value={amount}
          />
        </View>

        <View style={styles.quick}>
          {QUICK.map((value) => (
            <Pressable key={value} onPress={() => setAmount(String(value))} style={styles.chip}>
              <Text style={styles.chipText}>{value}</Text>
            </Pressable>
          ))}
        </View>

        <ChunkyButton
          disabled={!valid || busy}
          icon="add"
          label={busy ? 'Sending...' : `Give ${Number.isFinite(parsed) ? Math.abs(parsed) : 0} gems`}
          onPress={() => void send(Math.abs(parsed))}
          style={{ alignSelf: 'stretch', marginTop: space.sm }}
        />
        {/* the same call with the sign flipped, for undoing a mistake */}
        <ChunkyButton
          disabled={!valid || busy}
          icon="remove"
          label="Take them back"
          onPress={() => void send(-Math.abs(parsed))}
          style={{ alignSelf: 'stretch', marginTop: 10 }}
          tone="ghost"
        />

        <Note>
          The learner sees the new balance the next time their app loads the profile. If they are in a
          lesson right now, their own save can land after yours.
        </Note>

        {log.length ? (
          <>
            <Text style={styles.sectionHead}>This session</Text>
            <View style={{ gap: 10 }}>
              {log.map((entry, index) => (
                <View key={`${entry.email}-${index}`} style={styles.row}>
                  <Icon
                    name={entry.amount > 0 ? 'arrow-upward' : 'arrow-downward'}
                    size={20}
                    tint={entry.amount > 0 ? color.success : color.error}
                  />
                  <Text numberOfLines={1} style={styles.rowName}>
                    {entry.email}
                  </Text>
                  <Text style={styles.rowValue}>
                    {entry.amount > 0 ? '+' : ''}
                    {entry.amount} → {entry.total}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

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
  display: { ...type.display, color: color.onSurface },
  sub: { ...type.bodySm, color: color.onSurfaceVariant, marginTop: 4, marginBottom: 18 },
  sectionHead: { ...type.section, color: color.onSurface, marginTop: space.sm },
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
  quick: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    backgroundColor: color.surfaceLowest,
  },
  chipText: { ...type.label, color: color.onSurfaceVariant },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    backgroundColor: color.surfaceLowest,
  },
  rowName: { ...type.bodySm, flex: 1, color: color.onSurface },
  rowValue: { ...type.label, color: color.onSurfaceVariant },
});
