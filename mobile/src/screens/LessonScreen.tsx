import { useMemo, useState } from 'react';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, edge, radius, space, type } from '../theme';
import { AiError, gradeCode } from '../api/ai';
import { lessonById, type CodeQuestion, type Question } from '../data/lessons';
import { jumbledOrder, shuffledOrder } from '../data/shuffle';
import { useText } from '../i18n/useText';
import type { Action, State } from '../state/store';
import { AiCoach } from '../components/AiCoach';
import { CodeEditor } from '../components/CodeEditor';
import { ChunkyButton, Icon, sink } from '../components/ui';

const MARK = require('../../assets/logo-mark.png');

export function LessonScreen({ state, dispatch }: { state: State; dispatch: (action: Action) => void }) {
  const { t, language } = useText();
  const insets = useSafeAreaInsets();
  const session = state.lesson;
  const lesson = lessonById(session?.lessonId ?? 0);
  const question = lesson?.questions[session?.questionIndex ?? 0];
  const shake = useRef(new Animated.Value(0)).current;
  const [coachOpen, setCoachOpen] = useState(false);
  /* Only for the marker being unreachable. A wrong answer is not an error and
     never shows up here. */
  const [markerDown, setMarkerDown] = useState('');

  // a wrong answer nudges the card, matching the web build's shake
  useEffect(() => {
    if (!session?.shake) return;

    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => dispatch({ type: 'STOP_SHAKE' }));
  }, [session?.shake, shake, dispatch]);

  // a failure belongs to the question it happened on, not to the lesson
  useEffect(() => {
    setMarkerDown('');
    setCoachOpen(false);
  }, [session?.lessonId, session?.questionIndex]);

  if (!session || !lesson || !question) {
    return (
      <View style={[styles.screen, styles.empty]}>
        <ChunkyButton label={t('result.back')} onPress={() => dispatch({ type: 'GO_TO', screen: 'home' })} />
      </View>
    );
  }

  const selected = session.selected;
  const writing = question.type === 'code';
  const typed = typeof selected === 'string' ? selected : '';
  /* A code answer is only ready when it is more than the starter it began as:
     "Check" on untouched starter code is a wasted call and a wasted heart. */
  const canCheck =
    question.type === 'code'
      ? typed.trim().length > 0 && typed.trim() !== question.starter.trim()
      : selected.length > 0;
  const progress = ((session.questionIndex + Number(session.answered)) / lesson.questions.length) * 100;

  async function checkCode(exercise: CodeQuestion) {
    dispatch({ type: 'CHECK_CODE' });
    setMarkerDown('');

    try {
      const verdict = await gradeCode(language, {
        code: typed,
        goal: exercise.goal,
        answer: exercise.answer,
      });

      dispatch({
        type: 'CODE_MARKED',
        correct: verdict.correct,
        feedback: verdict.feedback,
        slip: verdict.slip,
      });
    } catch (error) {
      /* The question stays open. Marking it wrong because the network was down
         would take a heart for something the learner did not do. */
      dispatch({ type: 'CODE_UNMARKED' });
      setMarkerDown(
        error instanceof AiError && error.reason === 'quota'
          ? t('code.quota')
          : error instanceof AiError && error.reason === 'offline'
            ? t('code.offline')
            : t('code.down'),
      );
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.top, { paddingTop: insets.top, height: 68 + insets.top }]}>
        <Pressable
          accessibilityLabel={t('result.back')}
          accessibilityRole="button"
          onPress={() => dispatch({ type: 'GO_TO', screen: 'home' })}
          style={styles.iconButton}
        >
          <Icon name="close" size={26} tint={color.onSurfaceVariant} />
        </Pressable>

        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${progress}%` }]} />
        </View>

        {/* the way out of being stuck, put where a learner who is stuck will
            look: next to the thing counting down what being stuck costs */}
        <Pressable
          accessibilityLabel={t('coach.title')}
          accessibilityRole="button"
          onPress={() => setCoachOpen(true)}
          style={({ pressed }) => [styles.help, sink(pressed, edge.tile)]}
        >
          <Icon name="lightbulb" size={20} tint={color.onTertiaryContainer} />
        </Pressable>

        <View style={styles.hearts}>
          <Icon name="favorite" size={24} tint={color.error} />
          <Text style={styles.heartsValue}>{state.hearts}</Text>
        </View>
      </View>

      <AiCoach
        context={{
          prompt: question.prompt,
          code: 'code' in question ? question.code : question.type === 'code' ? question.starter : '',
          attempt: writing ? typed : describeAttempt(question, selected),
        }}
        onClose={() => setCoachOpen(false)}
        questionKey={`${session.lessonId}-${session.questionIndex}`}
        visible={coachOpen}
      />

      <Animated.View
        style={{
          flex: 1,
          transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-9, 9] }) }],
        }}
      >
        <ScrollView
          contentContainerStyle={{ padding: space.screen, paddingTop: 68 + insets.top + 12, paddingBottom: 140 }}
        >
          <Text style={styles.prompt}>{question.prompt}</Text>

          {'code' in question && question.code ? (
            <View style={styles.coach}>
              <View style={styles.mascot}>
                <Image source={MARK} style={styles.mascotImage} />
              </View>
              <View style={styles.bubble}>
                <Text style={styles.code}>{question.code}</Text>
              </View>
            </View>
          ) : null}

          {question.type === 'code' ? (
            <View style={styles.goal}>
              <Text style={styles.goalLabel}>{t('code.goal')}</Text>
              <Text style={styles.goalText}>{question.goal}</Text>
            </View>
          ) : null}

          {markerDown ? <Text style={styles.markerDown}>{markerDown}</Text> : null}

          <QuestionInput
            answered={session.answered}
            dispatch={dispatch}
            question={question}
            // a new lesson or a new question is what earns a new order
            questionKey={`${session.lessonId}-${session.questionIndex}`}
            selected={selected}
          />
        </ScrollView>
      </Animated.View>

      {session.answered ? (
        <View
          style={[
            styles.sheet,
            session.isCorrect ? styles.sheetGood : styles.sheetBad,
            { paddingBottom: insets.bottom + 20 },
          ]}
        >
          <View style={styles.sheetHead}>
            <Icon
              name={session.isCorrect ? 'check-circle' : 'cancel'}
              size={26}
              tint={session.isCorrect ? color.onSuccessContainer : color.onErrorContainer}
            />
            <Text
              style={[
                styles.sheetTitle,
                { color: session.isCorrect ? color.onSuccessContainer : color.onErrorContainer },
              ]}
            >
              {session.isCorrect ? t('lesson.correct') : t('lesson.wrong')}
            </Text>
          </View>
          <Text
            style={[
              styles.sheetText,
              { color: session.isCorrect ? color.onSuccessContainer : color.onErrorContainer },
            ]}
          >
            {/* the marker's own words when it marked this one: it read the code
                the learner actually wrote, which a stored explanation cannot */}
            {session.feedback || question.explanation}
          </Text>

          {/* Shown only after a wrong answer, and only for written code. There
              is no single right string here, so without seeing one worked
              version the learner is left guessing at what was wanted. */}
          {question.type === 'code' && session.isCorrect === false ? (
            <View style={styles.solution}>
              <Text style={styles.solutionLabel}>{t('code.solution')}</Text>
              <Text style={styles.solutionCode}>{question.answer}</Text>
            </View>
          ) : null}
          <ChunkyButton
            label={t('lesson.continue')}
            onPress={() => dispatch({ type: 'CONTINUE_LESSON' })}
            tone={session.isCorrect ? 'primary' : 'danger'}
          />
        </View>
      ) : (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 20 }]}>
          {session.checking ? (
            <View style={styles.marking}>
              <ActivityIndicator color={color.primaryContainer} />
              <Text style={styles.markingText}>{t('code.checking')}</Text>
            </View>
          ) : (
            <ChunkyButton
              disabled={!canCheck}
              label={writing ? t('code.check') : t('lesson.check')}
              onPress={() =>
                question.type === 'code'
                  ? void checkCode(question)
                  : dispatch({ type: 'CHECK_ANSWER' })
              }
            />
          )}
        </View>
      )}
    </View>
  );
}

function QuestionInput({
  question,
  selected,
  answered,
  dispatch,
  questionKey,
}: {
  question: Question;
  selected: string | number[];
  answered: boolean;
  dispatch: (action: Action) => void;
  /** changes when the question does, which is when a new order is wanted */
  questionKey: string;
}) {
  const { t } = useText();
  /* Held for as long as the question is on screen. Shuffling on every render
     would have the options swapping places under the finger. */
  const order = useMemo(
    () =>
      question.type === 'code'
        ? []
        : question.type === 'blocks'
          ? jumbledOrder(question.options.length)
          : shuffledOrder(question.options.length),
    [questionKey],
  );

  if (question.type === 'code') {
    return (
      <CodeEditor
        editable={!answered}
        onChange={(next) => dispatch({ type: 'SELECT_ANSWER', value: next })}
        value={typeof selected === 'string' ? selected : ''}
      />
    );
  }

  if (question.type === 'blocks') {
    const picked = Array.isArray(selected) ? selected : [];

    return (
      <View>
        <View style={styles.dropzone}>
          {picked.length ? (
            picked.map((slot, position) => (
              <Pressable
                disabled={answered}
                key={`${slot}-${position}`}
                onPress={() => dispatch({ type: 'TOGGLE_BLOCK', index: slot })}
                style={({ pressed }) => [styles.chip, sink(pressed && !answered, edge.tile)]}
              >
                <Text style={styles.chipText}>{question.options[slot]}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.dropzoneEmpty}>{t('lesson.buildHint')}</Text>
          )}
        </View>

        <View style={styles.chips}>
          {order.map((slot) => {
            const option = question.options[slot] as string;
            const used = picked.includes(slot);

            return (
              // the chip keeps its slot when used, so the bank does not reflow under the finger
              <Pressable
                disabled={answered || used}
                key={`${option}-${slot}`}
                onPress={() => dispatch({ type: 'TOGGLE_BLOCK', index: slot })}
                style={({ pressed }) => [
                  styles.chip,
                  used ? styles.chipUsed : null,
                  sink(pressed && !answered && !used, edge.tile),
                ]}
              >
                <Text style={[styles.chipText, used ? styles.chipTextUsed : null]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tiles}>
      {order.map((slot) => {
        const option = question.options[slot] as string;
        const isSelected = selected === option;
        const right = answered && option === question.answer;
        const wrong = answered && isSelected && option !== question.answer;

        return (
          <Pressable
            disabled={answered}
            key={option}
            onPress={() => dispatch({ type: 'SELECT_ANSWER', value: option })}
            style={({ pressed }) => [
              styles.tile,
              isSelected && !answered ? styles.tileSelected : null,
              right ? styles.tileRight : null,
              wrong ? styles.tileWrong : null,
              sink(pressed && !answered, edge.tile),
            ]}
          >
            <Text
              style={[
                styles.tileText,
                right ? { color: color.onSuccessContainer } : null,
                wrong ? { color: color.onErrorContainer } : null,
                isSelected && !answered ? { color: color.onTertiaryContainer } : null,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * What the learner has put forward so far, in words the coach can read.
 *
 * Blocks are positions in an array; handing those over would have the coach
 * hinting about "2, 0, 1". An empty string is honest when nothing is picked —
 * "they have not chosen yet" is itself useful for a first hint.
 */
function describeAttempt(question: Question, selected: string | number[]): string {
  if (!Array.isArray(selected)) return selected;
  if (question.type !== 'blocks') return '';

  return selected.map((slot) => question.options[slot] ?? '').join(' ');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  empty: { alignItems: 'center', justifyContent: 'center', padding: space.screen },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    backgroundColor: color.surface,
  },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  track: { flex: 1, height: 16, borderRadius: radius.pill, backgroundColor: color.surfaceHighest, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: radius.pill, backgroundColor: color.primaryContainer },
  help: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: color.tertiaryContainer,
    borderBottomWidth: edge.tile,
    backgroundColor: color.tertiaryWash,
  },
  hearts: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 44, justifyContent: 'flex-end' },
  goal: {
    gap: 4,
    marginBottom: 20,
    padding: 14,
    borderRadius: radius.base,
    borderLeftWidth: 4,
    borderLeftColor: color.primaryContainer,
    backgroundColor: color.surfaceContainer,
  },
  goalLabel: { ...type.labelSm, color: color.onSurfaceVariant },
  goalText: { ...type.bodySm, color: color.onSurface },
  markerDown: { ...type.bodySm, color: color.error, marginBottom: 14 },
  marking: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 56 },
  markingText: { ...type.label, fontSize: 15, color: color.onSurfaceVariant },
  solution: { gap: 4, padding: 12, borderRadius: radius.base, backgroundColor: color.surfaceLowest },
  solutionLabel: { ...type.labelSm, color: color.onSurfaceVariant },
  solutionCode: { ...type.code, color: color.onSurface },
  heartsValue: { ...type.label, fontSize: 15, color: color.error },
  prompt: { ...type.prompt, color: color.onSurface, marginBottom: space.screen },
  coach: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 22 },
  mascot: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    backgroundColor: color.surfaceLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotImage: { width: 56, height: 67 },
  bubble: {
    flex: 1,
    padding: 14,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    backgroundColor: color.surfaceLowest,
  },
  code: { ...type.code, color: color.onSurface },
  tiles: { gap: 12 },
  tile: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    borderBottomWidth: edge.tile,
    backgroundColor: color.surfaceLowest,
  },
  tileSelected: { borderColor: color.tertiaryContainer, backgroundColor: color.tertiaryWash },
  tileRight: { borderColor: color.successContainer, backgroundColor: color.successWash },
  tileWrong: { borderColor: color.error, backgroundColor: color.errorContainer },
  tileText: { ...type.code, color: color.onSurface },
  dropzone: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    minHeight: 64,
    marginBottom: 26,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: color.surfaceHighest,
  },
  dropzoneEmpty: { ...type.bodySm, color: color.outline },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  chip: {
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    borderBottomWidth: edge.tile,
    backgroundColor: color.surfaceLowest,
  },
  chipUsed: { backgroundColor: color.surfaceContainer, borderColor: color.surfaceContainer },
  chipText: { ...type.code, color: color.onSurface },
  chipTextUsed: { color: 'transparent' },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: space.screen,
    borderTopWidth: 2,
    borderTopColor: color.surfaceHighest,
    backgroundColor: color.surface,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 12,
    padding: space.screen,
    borderTopWidth: 2,
  },
  sheetGood: { borderTopColor: color.successContainer, backgroundColor: color.successWash },
  sheetBad: { borderTopColor: color.error, backgroundColor: color.errorContainer },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetTitle: { ...type.title, fontSize: 20 },
  sheetText: { ...type.bodySm },
});
