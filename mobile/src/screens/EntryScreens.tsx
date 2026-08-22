import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, edge, radius, space, type } from '../theme';
import { courseById, courses, onboardingSlides, unitDone } from '../data/lessons';
import { signInWithEmail, signUpWithEmail } from '../api/auth';
import { getErrorMessage } from '../api/progress';
import { useText } from '../i18n/useText';
import type { Action, State } from '../state/store';
import { accents, ChunkyButton, Icon, ProgressBar, sink } from '../components/ui';
import { DrawnIcon } from '../components/DrawnIcon';
import type { Session } from '@supabase/supabase-js';

const MARK = require('../../assets/logo-mark.png');

export function OnboardingScreen({ state, dispatch }: { state: State; dispatch: (action: Action) => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useText();
  const slide = onboardingSlides[state.onboardingIndex] ?? onboardingSlides[0]!;
  const last = state.onboardingIndex === onboardingSlides.length - 1;

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: space.screen },
      ]}
    >
      <View style={styles.brand}>
        <Image source={MARK} style={{ width: 34, height: 41 }} />
        <Text style={styles.brandText}>PyLearn</Text>
      </View>

      <View style={styles.hero}>
        {/* keyed by slide so the pen restarts from blank on every change */}
        <DrawnIcon key={slide.icon} name={slide.icon} size={200} />
      </View>

      <Text style={styles.slideTitle}>{slide.title}</Text>
      <Text style={styles.slideText}>{slide.text}</Text>

      <View style={styles.dots}>
        {onboardingSlides.map((item, index) => (
          <View
            key={item.title}
            style={[styles.dot, index === state.onboardingIndex ? styles.dotActive : null]}
          />
        ))}
      </View>

      <ChunkyButton
        label={last ? t('onboarding.start') : t('onboarding.next')}
        onPress={() => dispatch({ type: 'NEXT_ONBOARDING' })}
        style={{ alignSelf: 'stretch' }}
      />
      <Pressable
        onPress={() => {
          // this link states the intent outright, so open auth already on Log in
          dispatch({ type: 'SET_AUTH_MODE', mode: 'login' });
          dispatch({ type: 'GO_TO', screen: 'auth' });
        }}
        style={styles.ghostLink}
      >
        <Text style={styles.ghostLinkText}>{t('auth.iHaveAccount')}</Text>
      </Pressable>
    </View>
  );
}

export function AuthScreen({
  state,
  dispatch,
  onAuthenticated,
}: {
  state: State;
  dispatch: (action: Action) => void;
  onAuthenticated: (session: Session) => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useText();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [focused, setFocused] = useState<'name' | 'email' | 'password' | null>(null);
  const [reveal, setReveal] = useState(false);
  const login = state.authMode === 'login';
  const canSubmit =
    email.trim().length > 3 && password.length >= 6 && (login || name.trim().length >= 2) && !busy;

  async function submit() {
    setError('');
    setStatus('');
    setBusy(true);

    try {
      const credentials = { email: email.trim(), password };
      const session = login
        ? await signInWithEmail(credentials)
        : await signUpWithEmail({ ...credentials, name: name.trim() });

      if (!login) {
        // held in app state too, so the League has a name to show before the
        // first save round-trip finishes
        dispatch({ type: 'SET_DISPLAY_NAME', name: name.trim() });
      }

      if (session) {
        // Where to land depends on whether this account already has a profile,
        // and that is not known yet. App decides once the load finishes; jumping
        // to the intake here is what made it flash past returning learners.
        onAuthenticated(session);
      } else {
        setStatus(t('auth.checkInbox'));
      }
    } catch (authError) {
      setError(getErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ padding: space.screen, paddingTop: insets.top + 64, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.brand, { justifyContent: 'center' }]}>
          <Image source={MARK} style={{ width: 34, height: 41 }} />
          <Text style={styles.brandText}>PyLearn</Text>
        </View>

        <Text style={styles.authTitleCentered}>
          {login ? t('auth.welcomeBack') : t('auth.createProfile')}
        </Text>
        <Text style={styles.authSub}>{login ? t('auth.subLogin') : t('auth.subRegister')}</Text>

        <View style={styles.modeTabs}>
          {(['login', 'register'] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => dispatch({ type: 'SET_AUTH_MODE', mode })}
              style={[styles.modeTab, state.authMode === mode ? styles.modeTabActive : null]}
            >
              <Text style={[styles.modeTabText, state.authMode === mode ? styles.modeTabTextActive : null]}>
                {mode === 'login' ? t('auth.logIn') : t('auth.signUp')}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Sign-up only: logging in already has a name saved against the account.
            Capped at 24 so a long one cannot blow out a League row. */}
        {!login ? (
          <View style={[styles.field, focused === 'name' ? styles.fieldFocus : null]}>
            <Icon name="person-outline" size={20} tint={focused === 'name' ? color.primary : color.outline} />
            <TextInput
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={24}
              onBlur={() => setFocused(null)}
              onChangeText={setName}
              onFocus={() => setFocused('name')}
              placeholder={t('auth.username')}
              placeholderTextColor={color.outline}
              style={styles.fieldInput}
              value={name}
            />
          </View>
        ) : null}

        <View style={[styles.field, focused === 'email' ? styles.fieldFocus : null]}>
          <Icon name="mail-outline" size={20} tint={focused === 'email' ? color.primary : color.outline} />
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onBlur={() => setFocused(null)}
            onChangeText={setEmail}
            onFocus={() => setFocused('email')}
            placeholder={t('auth.email')}
            placeholderTextColor={color.outline}
            style={styles.fieldInput}
            value={email}
          />
        </View>

        <View style={[styles.field, focused === 'password' ? styles.fieldFocus : null]}>
          <Icon name="lock-outline" size={20} tint={focused === 'password' ? color.primary : color.outline} />
          <TextInput
            autoCapitalize="none"
            onBlur={() => setFocused(null)}
            onChangeText={setPassword}
            onFocus={() => setFocused('password')}
            placeholder={t('auth.password')}
            placeholderTextColor={color.outline}
            secureTextEntry={!reveal}
            style={styles.fieldInput}
            value={password}
          />
          <Pressable
            accessibilityLabel={reveal ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setReveal((value) => !value)}
          >
            <Icon name={reveal ? 'visibility-off' : 'visibility'} size={20} tint={color.outline} />
          </Pressable>
        </View>

        {error ? (
          <View style={[styles.alert, styles.alertError]}>
            <Text style={styles.alertErrorText}>{error}</Text>
          </View>
        ) : null}
        {status ? (
          <View style={[styles.alert, styles.alertOk]}>
            <Text style={styles.alertOkText}>{status}</Text>
          </View>
        ) : null}

        <ChunkyButton
          disabled={!canSubmit}
          label={busy ? t('auth.connecting') : t('auth.continue')}
          onPress={() => void submit()}
        />

        {/* The rule only earns its place once it is being broken; the rest of the
            time the footer belongs to the way across to the other mode. */}
        {!login && password.length > 0 && password.length < 6 ? (
          <Text style={styles.authFoot}>{t('auth.passwordRule')}</Text>
        ) : null}

        <Pressable
          accessibilityLabel={login ? 'Create an account' : 'Log in to an existing account'}
          accessibilityRole="link"
          hitSlop={10}
          onPress={() => dispatch({ type: 'SET_AUTH_MODE', mode: login ? 'register' : 'login' })}
        >
          <Text style={styles.authFoot}>
            {login ? t('auth.newHere') : t('auth.haveAccount')}
            <Text style={styles.authFootLink}>
              {login ? t('auth.createAccount') : t('auth.logIn')}
            </Text>
          </Text>
        </Pressable>
      </ScrollView>

      {/* Declared last on purpose: siblings later in the tree draw above earlier
          ones, so this keeps the scroll view from swallowing the touch. The entry
          flow has no navigation stack, so the way out has to be explicit. */}
      <Pressable
        accessibilityLabel="Back to the welcome screens"
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => dispatch({ type: 'GO_TO', screen: 'onboarding' })}
        style={({ pressed }) => [styles.authBack, { top: insets.top + 8 }, pressed ? styles.authBackPressed : null]}
      >
        <Icon name="arrow-back" size={26} tint={color.onSurfaceVariant} />
      </Pressable>

    </KeyboardAvoidingView>
  );
}

export function ChoiceScreen({
  title,
  subtitle,
  options,
  onSelect,
}: {
  title: string;
  subtitle: string;
  options: { icon: string; title: string; text: string }[];
  onSelect: (value: string) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={{ padding: space.screen, paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }}
      style={styles.screen}
    >
      <Text style={styles.authTitle}>{title}</Text>
      <Text style={styles.slideTextLeft}>{subtitle}</Text>

      <View style={{ gap: 12, marginTop: space.md }}>
        {options.map((option) => (
          <Pressable
            key={option.title}
            onPress={() => onSelect(option.title)}
            style={({ pressed }) => [styles.optionCard, sink(pressed, edge.card)]}
          >
            <View style={styles.optionIcon}>
              <Icon name={option.icon} size={26} tint={color.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionText}>{option.text}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

/**
 * Which course you are on.
 *
 * Doubles as the first-run picker and the switcher, because they are the same
 * question and a second screen asking it differently would only be a second
 * place for the answer to disagree.
 *
 * Progress is shared: XP, streak, gems and hearts belong to the learner, not to
 * a course. Only the path changes. That is what makes switching cheap enough to
 * do out of curiosity, which is the point of offering it at all.
 */
export function LanguageScreen({ state, dispatch }: { state: State; dispatch: (action: Action) => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useText();
  const current = courseById(state.language).id;
  /* Named here rather than in the course list: these have no lessons behind
     them, and a Course with an empty units array would be a real course that
     draws an empty path. Better that they cannot be chosen at all. */
  const soon: [string, string][] = [
    ['JavaScript', 'javascript'],
    ['Java', 'coffee'],
    ['C++', 'memory'],
    ['Rust', 'settings'],
  ];

  return (
    <ScrollView
      contentContainerStyle={{ padding: space.screen, paddingTop: insets.top + 32, paddingBottom: insets.bottom + 40 }}
      style={styles.screen}
    >
      <Text style={styles.authTitle}>{t('course.title')}</Text>
      <Text style={styles.slideTextLeft}>{t('course.sub')}</Text>

      <View style={styles.courseList}>
        {courses.map((course) => {
          const accent = accents[course.tone];
          const total = course.units.reduce((sum, unit) => sum + unit.lessons.length, 0);
          const done = course.units.reduce((sum, unit) => sum + unitDone(unit, state.completedLessons), 0);
          const active = course.id === current;

          return (
            <Pressable
              key={course.id}
              onPress={() => dispatch({ type: 'SET_LANGUAGE', language: course.id })}
              style={({ pressed }) => [
                styles.courseCard,
                /* The chosen one is filled with its accent; the others are only
                   outlined in it. One glance answers "which am I on", which a
                   badge in the corner never quite does. */
                active
                  ? { borderColor: accent.edge, backgroundColor: accent.wash }
                  : { borderColor: color.surfaceHighest, backgroundColor: color.surfaceLowest },
                sink(pressed, edge.card),
              ]}
            >
              <View style={styles.courseTop}>
                <View style={[styles.courseIcon, { backgroundColor: active ? accent.fill : color.surfaceContainer }]}>
                  <Icon name={course.icon} size={30} tint={active ? accent.on : color.onSurfaceVariant} />
                </View>

                <View style={styles.courseHead}>
                  <Text style={styles.courseName}>{course.title}</Text>
                  <Text style={styles.courseBlurb}>{course.blurb}</Text>
                </View>

                {active ? (
                  <View style={[styles.courseTick, { backgroundColor: accent.fill }]}>
                    <Icon name="check" size={18} tint={accent.on} />
                  </View>
                ) : null}
              </View>

              <ProgressBar done={done} total={total} tint={accent.fill} />

              <View style={styles.courseFoot}>
                <Text style={styles.courseMeta}>
                  {done === 0 ? t('course.notStarted') : t('course.progress', { done, total })}
                </Text>
                <Text style={[styles.courseAction, active ? { color: accent.edge } : null]}>
                  {active ? t('course.current') : t('course.open')}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* The unwritten ones stay small. Given the same card as a real course
          they would take up two thirds of the screen saying nothing. */}
      <Text style={styles.soonHead}>{t('course.soon')}</Text>
      <View style={styles.soonGrid}>
        {soon.map(([name, icon]) => (
          <View key={name} style={styles.soonTile}>
            <Icon name={icon} size={20} tint={color.outlineVariant} />
            <Text style={styles.soonName}>{name}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.soonNote}>{t('course.locked')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  courseList: { gap: 14, marginTop: 24 },
  courseCard: {
    gap: 14,
    padding: 18,
    borderRadius: radius.base,
    borderWidth: 2,
    borderBottomWidth: edge.card,
  },
  courseTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  courseIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  courseHead: { flex: 1, gap: 3 },
  courseName: { ...type.title, fontSize: 21, color: color.onSurface },
  courseBlurb: { ...type.bodySm, color: color.onSurfaceVariant },
  courseTick: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  courseFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  courseMeta: { ...type.labelSm, color: color.onSurfaceVariant },
  courseAction: { ...type.label, color: color.primary },
  soonHead: { ...type.labelSm, color: color.outline, letterSpacing: 0.6, marginTop: 32, marginBottom: 10 },
  soonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  soonTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: color.surfaceHigh,
    backgroundColor: color.surfaceLow,
  },
  soonName: { ...type.label, color: color.outline },
  soonNote: { ...type.labelSm, color: color.outline, marginTop: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandText: { ...type.title, color: color.primary },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  slideTitle: { ...type.display, color: color.onSurface, textAlign: 'center' },
  slideText: {
    ...type.body,
    color: color.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 10,
  },
  slideTextLeft: { ...type.bodySm, color: color.onSurfaceVariant, marginTop: 6 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 28 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: color.surfaceHighest },
  dotActive: { width: 28, backgroundColor: color.primaryContainer },
  ghostLink: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: 12 },
  // links read as the brand, not as the orange accent, which now means "selected"
  ghostLinkText: { ...type.label, color: color.primary },
  authBack: {
    position: 'absolute',
    left: 12,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  authBackPressed: { backgroundColor: color.surfaceHigh },
  authTitle: { ...type.display, color: color.onSurface },
  authTitleCentered: {
    ...type.display,
    marginTop: space.md,
    color: color.onSurface,
    textAlign: 'center',
  },
  authSub: {
    ...type.bodySm,
    marginTop: 4,
    marginBottom: space.md,
    color: color.onSurfaceVariant,
    textAlign: 'center',
  },
  modeTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: space.sm,
    padding: 5,
    borderRadius: 18,
    backgroundColor: color.surfaceContainer,
  },
  modeTab: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  modeTabActive: { backgroundColor: color.primaryContainer },
  modeTabText: { ...type.label, color: color.onSurfaceVariant },
  modeTabTextActive: { color: color.onPrimaryContainer },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    marginBottom: 14,
    paddingHorizontal: space.sm,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    backgroundColor: color.surfaceLowest,
  },
  fieldFocus: { borderColor: color.primaryContainer, backgroundColor: color.primaryWashSoft },
  fieldInput: { flex: 1, ...type.body, color: color.onSurface },
  // labelSm's 12pt was fine for a passive caption, but this line is now the way
  // across to the other mode, so it is sized to be read rather than skimmed
  authFoot: {
    ...type.bodySm,
    fontSize: 16,
    lineHeight: 23,
    marginTop: space.md,
    color: color.onSurfaceVariant,
    textAlign: 'center',
  },
  // weight and the brand green carry the affordance; an underline on top of
  // both would only add noise at this size
  authFootLink: {
    color: color.primary,
    fontFamily: type.title.fontFamily,
  },
  alert: { padding: 12, borderRadius: radius.base, marginBottom: 14 },
  alertError: { backgroundColor: color.errorContainer },
  alertErrorText: { ...type.bodySm, color: color.onErrorContainer },
  alertOk: { backgroundColor: color.successWash },
  alertOkText: { ...type.bodySm, color: color.onSuccessContainer },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 78,
    padding: 12,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    borderBottomWidth: edge.card,
    backgroundColor: color.surfaceLowest,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.base,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.primaryWashSoft,
  },
  optionTitle: { ...type.label, fontSize: 17, color: color.onSurface },
  optionText: { ...type.labelSm, color: color.onSurfaceVariant, marginTop: 2 },
});
