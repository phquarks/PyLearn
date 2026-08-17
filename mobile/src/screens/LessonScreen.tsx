import { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, edge, radius, space, type } from '../theme';
import { lessons, type Question } from '../data/lessons';
import type { Action, State } from '../state/store';
import { ChunkyButton, Icon, sink } from '../components/ui';

const MARK = require('../../assets/logo-mark.png');

export function LessonScreen({ state, dispatch }: { state: State; dispatch: (action: Action) => void }) {
  const insets = useSafeAreaInsets();
  const session = state.lesson;
  const lesson = lessons.find((item) => item.id === session?.lessonId);
  const question = lesson?.questions[session?.questionIndex ?? 0];
  const shake = useRef(new Animated.Value(0)).current;

  // a wrong answer nudges the card, matching the web build's shake
  useEffect(() => {
    if (!session?.shake) return;

    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => dispatch({ type: 'STOP_SHAKE' }));
  }, [session?.shake, shake, dispatch]);

  if (!session || !lesson || !question) {
    return (
      <View style={[styles.screen, styles.empty]}>
        <ChunkyButton label="Back to the path" onPress={() => dispatch({ type: 'GO_TO', screen: 'home' })} />
      </View>
    );
  }

  const selected = session.selected;
  const canCheck = Array.isArray(selected) ? selected.length > 0 : selected.length > 0;
  const progress = ((session.questionIndex + Number(session.answered)) / lesson.questions.length) * 100;

  return (
    <View style={styles.screen}>
      <View style={[styles.top, { paddingTop: insets.top, height: 68 + insets.top }]}>
        <Pressable
          accessibilityLabel="Quit lesson"
          accessibilityRole="button"
          onPress={() => dispatch({ type: 'GO_TO', screen: 'home' })}
          style={styles.iconButton}
        >
          <Icon name="close" size={26} tint={color.onSurfaceVariant} />
        </Pressable>

        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.hearts}>
          <Icon name="favorite" size={24} tint={color.error} />
          <Text style={styles.heartsValue}>{state.hearts}</Text>
        </View>
      </View>

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

          <QuestionInput answered={session.answered} dispatch={dispatch} question={question} selected={selected} />
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
              {session.isCorrect ? 'Nice work!' : 'Almost!'}
            </Text>
          </View>
          <Text
            style={[
              styles.sheetText,
              { color: session.isCorrect ? color.onSuccessContainer : color.onErrorContainer },
            ]}
          >
            {question.explanation}
          </Text>
          <ChunkyButton
            label="Continue"
            onPress={() => dispatch({ type: 'CONTINUE_LESSON' })}
            tone={session.isCorrect ? 'primary' : 'danger'}
          />
        </View>
      ) : (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 20 }]}>
          <ChunkyButton disabled={!canCheck} label="Check" onPress={() => dispatch({ type: 'CHECK_ANSWER' })} />
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
}: {
  question: Question;
  selected: string | number[];
  answered: boolean;
  dispatch: (action: Action) => void;
}) {
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
            <Text style={styles.dropzoneEmpty}>Tap the blocks below to build the line</Text>
          )}
        </View>

        <View style={styles.chips}>
          {question.options.map((option, slot) => {
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
      {question.options.map((option) => {
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
  hearts: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 44, justifyContent: 'flex-end' },
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
