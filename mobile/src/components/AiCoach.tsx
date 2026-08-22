import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AiError, askHint, askMentor } from '../api/ai';
import { useText } from '../i18n/useText';
import { color, edge, radius, space, type } from '../theme';
import { Icon, sink } from './ui';

/**
 * Sneaky, when you are stuck.
 *
 * Two things share one sheet because they are one thing from where the learner
 * sits: a ladder of hints they can climb a rung at a time, and somewhere to ask
 * in their own words. Splitting them into two buttons only asks the person who
 * is already stuck to first decide what kind of stuck they are.
 *
 * Neither ever hands over the answer — that rule lives in the edge function,
 * not here, because a rule enforced on the phone is a rule anybody can edit.
 * What lives here is the ladder's height: three rungs, and the third still
 * stops at "here is why this cannot work", never at the corrected line.
 */

const RUNGS = 3;

type Turn = { from: 'you' | 'coach'; text: string; hint?: number };

export function AiCoach({
  visible,
  onClose,
  context,
  questionKey,
}: {
  visible: boolean;
  onClose: () => void;
  /* What the coach is allowed to see. No `prompt` means no exercise — opened
     from the path or from Sneaky's own page — and the sheet becomes a plain
     conversation: the hint ladder has nothing to climb without a question to be
     stuck on, so it is not drawn at all. */
  context: { prompt?: string; code?: string; attempt?: string; about?: string };
  /** changes with the question, which is what empties the thread */
  questionKey: string;
}) {
  const { t, language } = useText();
  const insets = useSafeAreaInsets();
  const [thread, setThread] = useState<Turn[]>([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const scroller = useRef<ScrollView>(null);

  const onExercise = Boolean(context.prompt);
  const rungsUsed = thread.filter((turn) => turn.hint).length;

  // a new question is a new conversation; carrying the last one over would have
  // the coach answering about an exercise that is no longer on screen
  useEffect(() => {
    setThread([]);
    setQuestion('');
    setFailure('');
  }, [questionKey]);

  function explain(error: unknown): string {
    if (error instanceof AiError && error.reason === 'quota') return t('coach.quota');
    if (error instanceof AiError && error.reason === 'offline') return t('coach.offline');

    return t('coach.down');
  }

  async function nextHint() {
    if (busy || rungsUsed >= RUNGS) return;

    const level = rungsUsed + 1;

    setBusy(true);
    setFailure('');

    try {
      const { reply } = await askHint(language, {
        level,
        prompt: context.prompt ?? '',
        code: context.code,
        attempt: context.attempt,
      });

      setThread((turns) => [...turns, { from: 'coach', text: reply, hint: level }]);
    } catch (error) {
      setFailure(explain(error));
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    const asked = question.trim();

    if (busy || !asked) return;

    setThread((turns) => [...turns, { from: 'you', text: asked }]);
    setQuestion('');
    setBusy(true);
    setFailure('');

    try {
      const { reply } = await askMentor(language, {
        question: asked,
        prompt: context.prompt,
        code: context.code,
        attempt: context.attempt,
        // which course they are on, so a free question lands in the right world
        about: context.about,
      });

      setThread((turns) => [...turns, { from: 'coach', text: reply }]);
    } catch (error) {
      setFailure(explain(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.scrim} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.lift}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.head}>
            <View style={styles.headText}>
              <Text style={styles.title}>{onExercise ? t('coach.title') : t('coach.freeTitle')}</Text>
              <Text style={styles.sub}>{onExercise ? t('coach.sub') : t('coach.freeSub')}</Text>
            </View>
            <Pressable accessibilityLabel={t('coach.close')} onPress={onClose} style={styles.close}>
              <Icon name="close" size={24} tint={color.onSurfaceVariant} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.thread}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
            ref={scroller}
            style={styles.threadBox}
          >
            {thread.length === 0 && !busy ? (
              <Text style={styles.empty}>{onExercise ? t('coach.empty') : t('coach.freeEmpty')}</Text>
            ) : null}

            {thread.map((turn, index) => (
              <View
                key={index}
                style={[styles.bubble, turn.from === 'you' ? styles.bubbleYou : styles.bubbleCoach]}
              >
                {turn.hint ? (
                  <Text style={styles.hintLabel}>
                    {t('coach.hintOf', { level: turn.hint, total: RUNGS })}
                  </Text>
                ) : null}
                <Text style={turn.from === 'you' ? styles.textYou : styles.textCoach}>{turn.text}</Text>
              </View>
            ))}

            {busy ? (
              <View style={[styles.bubble, styles.bubbleCoach, styles.thinking]}>
                <ActivityIndicator color={color.primaryContainer} />
                <Text style={styles.textCoach}>{t('coach.thinking')}</Text>
              </View>
            ) : null}

            {failure ? <Text style={styles.failure}>{failure}</Text> : null}
          </ScrollView>

          {onExercise ? (
          <Pressable
            disabled={busy || rungsUsed >= RUNGS}
            onPress={() => void nextHint()}
            style={({ pressed }) => [
              styles.ladder,
              rungsUsed >= RUNGS ? styles.ladderSpent : null,
              sink(pressed && !busy && rungsUsed < RUNGS, edge.tile),
            ]}
          >
            <Icon
              name="lightbulb"
              size={20}
              tint={rungsUsed >= RUNGS ? color.outline : color.onTertiaryContainer}
            />
            <Text style={[styles.ladderText, rungsUsed >= RUNGS ? styles.ladderTextSpent : null]}>
              {rungsUsed >= RUNGS
                ? t('coach.noMoreHints')
                : t('coach.nextHint', { level: rungsUsed + 1, total: RUNGS })}
            </Text>
          </Pressable>
          ) : null}

          <View style={styles.ask}>
            <TextInput
              editable={!busy}
              onChangeText={setQuestion}
              onSubmitEditing={() => void send()}
              placeholder={onExercise ? t('coach.placeholder') : t('coach.freePlaceholder')}
              placeholderTextColor={color.outline}
              returnKeyType="send"
              style={styles.field}
              value={question}
            />
            <Pressable
              accessibilityLabel={t('coach.send')}
              disabled={busy || !question.trim()}
              onPress={() => void send()}
              style={({ pressed }) => [
                styles.send,
                !question.trim() || busy ? styles.sendOff : null,
                sink(pressed && !busy && Boolean(question.trim()), edge.tile),
              ]}
            >
              <Icon name="arrow-upward" size={22} tint="#ffffff" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(9, 24, 38, 0.42)' },
  lift: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: {
    gap: 12,
    padding: space.screen,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 2,
    borderTopColor: color.surfaceHighest,
    backgroundColor: color.surface,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headText: { flex: 1, gap: 2 },
  title: { ...type.title, color: color.onSurface },
  sub: { ...type.bodySm, color: color.onSurfaceVariant },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  // capped rather than free-growing: the sheet must never push its own input
  // off the top of the screen on a small phone
  threadBox: { maxHeight: 300 },
  thread: { gap: 10, paddingBottom: 4 },
  empty: { ...type.bodySm, color: color.onSurfaceVariant },
  bubble: { padding: 12, borderRadius: radius.base, gap: 4 },
  bubbleCoach: { backgroundColor: color.surfaceContainer, alignSelf: 'stretch' },
  bubbleYou: { backgroundColor: color.tertiaryWash, alignSelf: 'flex-end', maxWidth: '85%' },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hintLabel: { ...type.labelSm, color: color.onSurfaceVariant },
  textCoach: { ...type.bodySm, color: color.onSurface },
  textYou: { ...type.bodySm, color: color.onTertiaryContainer },
  failure: { ...type.bodySm, color: color.error },
  ladder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.tertiaryContainer,
    borderBottomWidth: edge.tile,
    backgroundColor: color.tertiaryWash,
  },
  ladderSpent: { borderColor: color.surfaceHighest, backgroundColor: color.surfaceContainer },
  ladderText: { ...type.label, fontSize: 15, color: color.onTertiaryContainer },
  ladderTextSpent: { color: color.outline },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  field: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    backgroundColor: color.surfaceLowest,
    ...type.bodySm,
    color: color.onSurface,
  },
  send: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.base,
    borderBottomWidth: edge.tile,
    borderBottomColor: color.primaryEdge,
    backgroundColor: color.primaryContainer,
  },
  sendOff: { backgroundColor: color.surfaceHighest, borderBottomColor: color.surfaceDim },
});
