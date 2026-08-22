import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AiError, buildPersonalLesson } from '../api/ai';
import {
  countUnused,
  markUsed,
  myGeneratedLessons,
  removeGeneratedLesson,
  saveGeneratedLesson,
  unusedMistakes,
  type StoredLesson,
} from '../api/mistakes';
import { registerGeneratedLesson } from '../data/customLessons';
import { useText } from '../i18n/useText';
import type { Action } from '../state/store';
import { color, edge, radius, space, type } from '../theme';
import { ChunkyButton, Icon, sink } from '../components/ui';

/**
 * Lessons made out of your own wrong answers.
 *
 * The course is the same for everybody, which is right for teaching Python and
 * wrong for the twenty minutes after you have got four questions about list
 * indexing wrong in a row. This screen is those twenty minutes: it reads what
 * you actually got wrong and asks for the same ideas back from a different
 * angle — not the same questions again, which would only teach the answers.
 *
 * Nothing here costs hearts and nothing here pays XP. It is not a shortcut past
 * the course and it is not a punishment; it is practice, and practice you are
 * afraid to open is practice nobody does.
 */

/* Below this the generated lesson is about one bad afternoon rather than about
   a pattern, and it shows: three or four questions all rewording the same slip. */
const ENOUGH = 3;

export function PracticeScreen({
  dispatch,
  userId,
}: {
  dispatch: (action: Action) => void;
  userId: string;
}) {
  const { t, language } = useText();
  const insets = useSafeAreaInsets();
  const [waiting, setWaiting] = useState<number | null>(null);
  const [saved, setSaved] = useState<StoredLesson[]>([]);
  const [building, setBuilding] = useState(false);
  const [failure, setFailure] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;

    const [count, lessons] = await Promise.all([countUnused(userId), myGeneratedLessons(userId)]);

    setWaiting(count);
    setSaved(lessons);
  }, [userId]);

  useEffect(() => {
    void load().catch(() => setFailure(t('practice.offline')));
  }, [load, t]);

  async function build() {
    if (building || !userId) return;

    setBuilding(true);
    setFailure('');

    try {
      const mistakes = await unusedMistakes(userId);
      const written = await buildPersonalLesson(
        language,
        mistakes.map(({ topic, prompt, chosen, answer }) => ({ topic, prompt, chosen, answer })),
      );
      const stored = await saveGeneratedLesson(userId, written.title, written.questions);

      /* Marked spent only once the lesson is safely saved. The other order
         loses the mistakes to a failed insert, and they are not recoverable. */
      await markUsed(mistakes.map((mistake) => mistake.id));

      registerGeneratedLesson(stored.id, stored.title, stored.questions);
      await load();
    } catch (error) {
      setFailure(
        error instanceof AiError && error.reason === 'quota'
          ? t('practice.quota')
          : error instanceof AiError && error.reason === 'offline'
            ? t('practice.offline')
            : t('practice.failed'),
      );
    } finally {
      setBuilding(false);
    }
  }

  function open(lesson: StoredLesson) {
    const registered = registerGeneratedLesson(lesson.id, lesson.title, lesson.questions);

    dispatch({ type: 'START_LESSON', lessonId: registered.id });
  }

  async function remove(lesson: StoredLesson) {
    setSaved((list) => list.filter((item) => item.id !== lesson.id));

    try {
      await removeGeneratedLesson(lesson.id);
    } catch {
      // it is still on the server; the next load puts it back rather than
      // leaving the learner believing something is gone when it is not
      await load().catch(() => undefined);
    }
  }

  const ready = (waiting ?? 0) >= ENOUGH;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.page,
        // this screen carries no top bar, so it owns its own status-bar gap
        { paddingTop: insets.top + space.screen, paddingBottom: insets.bottom + 120 },
      ]}
    >
      <Text style={styles.title}>{t('practice.title')}</Text>
      <Text style={styles.sub}>{t('practice.sub')}</Text>

      <View style={styles.builder}>
        {waiting === null ? (
          <ActivityIndicator color={color.primaryContainer} />
        ) : ready ? (
          <>
            <Text style={styles.waiting}>{t('practice.waiting', { count: waiting })}</Text>
            {building ? (
              <View style={styles.busy}>
                <ActivityIndicator color={color.primaryContainer} />
                <Text style={styles.busyText}>{t('practice.building')}</Text>
              </View>
            ) : (
              <ChunkyButton icon="auto-awesome" label={t('practice.build')} onPress={() => void build()} />
            )}
          </>
        ) : (
          <>
            <Text style={styles.emptyTitle}>{t('practice.tooFew')}</Text>
            <Text style={styles.emptyText}>{t('practice.tooFewText')}</Text>
          </>
        )}

        {failure ? <Text style={styles.failure}>{failure}</Text> : null}
      </View>

      <Text style={styles.section}>{t('practice.saved')}</Text>

      {saved.length === 0 ? (
        <Text style={styles.emptyText}>{t('practice.empty')}</Text>
      ) : (
        saved.map((lesson) => (
          <View key={lesson.id} style={styles.row}>
            <Pressable
              onPress={() => open(lesson)}
              style={({ pressed }) => [styles.card, sink(pressed, edge.card)]}
            >
              <View style={styles.badge}>
                <Icon name="auto-awesome" size={20} tint={color.onTertiaryContainer} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{lesson.title}</Text>
                <Text style={styles.cardMeta}>
                  {t('practice.free')} · {lesson.questions.length}
                </Text>
              </View>
              <Icon name="chevron-right" size={24} tint={color.outline} />
            </Pressable>

            <Pressable
              accessibilityLabel={t('practice.remove')}
              onPress={() => void remove(lesson)}
              style={styles.remove}
            >
              <Icon name="delete-outline" size={22} tint={color.onSurfaceVariant} />
            </Pressable>
          </View>
        ))
      )}

      <ChunkyButton
        label={t('practice.back')}
        onPress={() => dispatch({ type: 'GO_TO', screen: 'progress' })}
        style={styles.back}
        tone="ghost"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.screen, gap: 12 },
  title: { ...type.display, color: color.onSurface },
  sub: { ...type.bodySm, color: color.onSurfaceVariant, marginBottom: 6 },
  builder: {
    gap: 12,
    padding: space.sm,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    backgroundColor: color.surfaceLowest,
  },
  waiting: { ...type.bodySm, color: color.onSurface },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 56 },
  busyText: { ...type.label, fontSize: 15, color: color.onSurfaceVariant },
  emptyTitle: { ...type.headline, color: color.onSurface },
  emptyText: { ...type.bodySm, color: color.onSurfaceVariant },
  failure: { ...type.bodySm, color: color.error },
  section: { ...type.section, color: color.onSurface, marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    borderBottomWidth: edge.card,
    backgroundColor: color.surfaceLowest,
  },
  badge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: color.tertiaryWash,
  },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { ...type.headline, color: color.onSurface },
  cardMeta: { ...type.labelSm, color: color.onSurfaceVariant },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  back: { marginTop: 18 },
});
