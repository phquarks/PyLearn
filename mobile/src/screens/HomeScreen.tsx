import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, edge, path as P, radius, space, type } from '../theme';
import { costsHearts, lessonsOf, unitDone, unitsOf, type UnitTone } from '../data/lessons';
import { useText } from '../i18n/useText';
import type { Action, State } from '../state/store';
import { Icon, sink } from '../components/ui';

const MARK = require('../../assets/logo-mark.png');

/* Stone centres and the ribbon come from one table inside a fixed 320-wide
   space pinned to the centre line — the same arrangement the web build uses.
   Sharing the geometry is what keeps the ribbon threaded through the stones.

   The index is local to a unit, so every unit's path starts from the same
   place and the swing pattern reads the same way down each one. */
const cx = (index: number) => P.width / 2 + (P.swing[index % P.swing.length] ?? 0);
const cy = (index: number) => P.top + index * P.step;

function buildTrack(count: number) {
  let d = `M ${cx(0)} ${cy(0)}`;

  for (let i = 1; i < count; i += 1) {
    const mid = (cy(i - 1) + cy(i)) / 2;
    d += ` C ${cx(i - 1)} ${mid} ${cx(i)} ${mid} ${cx(i)} ${cy(i)}`;
  }

  return d;
}

/** Each unit is drawn in one accent, so scrolling reads as moving between topics. */
const tones: Record<UnitTone, { fill: string; edge: string; on: string }> = {
  primary: { fill: color.primaryContainer, edge: color.primaryEdge, on: color.onPrimary },
  tertiary: { fill: color.tertiaryContainer, edge: color.tertiaryEdge, on: color.onTertiaryContainer },
  success: { fill: color.successContainer, edge: color.successEdge, on: color.onSuccessContainer },
  secondary: { fill: color.secondaryContainer, edge: color.secondaryEdge, on: color.onSecondaryContainer },
};

export function HomeScreen({ state, dispatch }: { state: State; dispatch: (action: Action) => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useText();
  const { height: screenHeight } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  /* Where each unit block sits in the scroll, and where its ribbon sits inside
     that block. Measured rather than calculated: the unit card's height depends
     on how its summary wraps. Kept apart because a child is laid out before its
     parent, so neither can be written in terms of the other at measure time. */
  const unitTops = useRef<Record<number, number>>({});
  const pathTops = useRef<Record<number, number>>({});
  const [measured, setMeasured] = useState(0);
  const jumped = useRef(false);

  /* Everything below is scoped to the course the learner is on. Progress is one
     flat list of finished ids across all courses, so switching courses changes
     which path is drawn without touching what has been finished on the other. */
  const units = unitsOf(state.language);
  const lessons = lessonsOf(state.language);

  /* Unlocking runs down the flat course order, not the unit: finishing the last
     lesson of one unit is what opens the first lesson of the next. */
  const unlocked = new Set<number>();
  lessons.forEach((lesson, index) => {
    const previous = lessons[index - 1];
    if (index === 0 || (previous && state.completedLessons.includes(previous.id))) {
      unlocked.add(lesson.id);
    }
  });

  const activeId = lessons.find((lesson) => !state.completedLessons.includes(lesson.id))?.id ?? null;

  /* Open on the stone the learner is actually standing on. With twelve units the
     path is thousands of points long, and starting at the top means scrolling
     past everything already finished to reach the one thing left to do. */
  // a different course is a different path, so the one-time jump happens again
  useEffect(() => {
    jumped.current = false;
  }, [state.language]);

  useEffect(() => {
    if (jumped.current || activeId === null) return;

    const unit = units.find((entry) => entry.lessons.some((lesson) => lesson.id === activeId));
    const index = unit?.lessons.findIndex((lesson) => lesson.id === activeId) ?? -1;
    const blockTop = unit ? unitTops.current[unit.id] : undefined;
    const pathTop = unit ? pathTops.current[unit.id] : undefined;

    if (!unit || index < 0 || blockTop === undefined || pathTop === undefined) return;

    const top = blockTop + pathTop;

    jumped.current = true;
    // a third of a screen above it, so the stone sits in view with its unit
    // still visible overhead rather than jammed against the top bar
    const y = Math.max(0, top + cy(index) - screenHeight / 3);

    // no animation: travelling through eleven units would be a journey, not feedback
    scroller.current?.scrollTo({ y, animated: false });
  }, [activeId, measured, screenHeight]);

  return (
    <ScrollView
      contentContainerStyle={{ paddingTop: 68 + insets.top + 16, paddingBottom: 120 + insets.bottom }}
      ref={scroller}
      style={styles.screen}
    >
      {units.map((unit, unitIndex) => {
        const tone = tones[unit.tone];
        const done = unitDone(unit, state.completedLessons);
        const cleared = done === unit.lessons.length;
        // one stop per lesson, plus the chest that closes the unit
        const stops = unit.lessons.length + 1;
        const trackHeight = cy(stops - 1) + 90;

        return (
          <View
            key={unit.id}
            onLayout={(event) => {
              unitTops.current[unit.id] = event.nativeEvent.layout.y;
              setMeasured((count) => count + 1);
            }}
          >
            <View style={[styles.unit, { backgroundColor: tone.fill, borderBottomColor: tone.edge }]}>
              <Text style={[styles.unitKicker, { color: tone.on }]}>
                {/* numbered within the course: unit ids are unique app-wide,
                    so the AI course would otherwise open at "Unit 101" */}
                {t('home.unitLine', { number: unitIndex + 1, done, total: unit.lessons.length })}
              </Text>
              <Text style={[styles.unitTitle, { color: tone.on }]}>{unit.title}</Text>
              <Text style={[styles.unitText, { color: tone.on }]}>{unit.summary}</Text>
              <Image source={MARK} style={styles.unitMark} />
            </View>

            <View
              onLayout={(event) => {
                pathTops.current[unit.id] = event.nativeEvent.layout.y;
                setMeasured((count) => count + 1);
              }}
              style={[styles.path, { height: trackHeight }]}
            >
              <Svg height={trackHeight} style={styles.track} width={P.width}>
                <Path
                  d={buildTrack(stops)}
                  fill="none"
                  stroke={color.surfaceHighest}
                  strokeLinecap="round"
                  strokeWidth={12}
                />
              </Svg>

              {unit.lessons.map((lesson, index) => {
                const open = unlocked.has(lesson.id);
                const complete = state.completedLessons.includes(lesson.id);
                const isActive = lesson.id === activeId && open;
                const answered =
                  isActive && state.lesson?.lessonId === lesson.id ? state.lesson.questionIndex : 0;
                const ring = 226;

                return (
                  <View
                    key={lesson.id}
                    style={[styles.stop, { top: cy(index) - P.stone / 2, left: cx(index) - P.stone / 2 }]}
                  >
                    {isActive ? (
                      <>
                        <Svg height={94} style={styles.ring} width={94}>
                          <Circle cx={47} cy={47} fill="none" r={36} stroke={color.surfaceHighest} strokeWidth={7} />
                          <Circle
                            cx={47}
                            cy={47}
                            fill="none"
                            r={36}
                            stroke={tone.fill}
                            strokeDasharray={ring}
                            strokeDashoffset={ring - (ring * answered) / lesson.questions.length}
                            strokeLinecap="round"
                            strokeWidth={7}
                            transform={`rotate(-90 47 47)`}
                          />
                        </Svg>
                        <View style={[styles.cheer, cx(index) >= P.width / 2 ? styles.cheerLeft : styles.cheerRight]}>
                          <Image source={MARK} style={styles.cheerMark} />
                          <Text style={styles.cheerText}>{t('home.cheer')}</Text>
                        </View>
                      </>
                    ) : null}

                    <Pressable
                      accessibilityLabel={`${lesson.title}${complete ? ', completed' : open ? '' : ', locked'}`}
                      accessibilityRole="button"
                      disabled={!open}
                      onPress={() =>
                        // no hearts and this one costs them: say so before the
                        // first question rather than after a wrong answer
                        state.hearts === 0 && costsHearts(lesson.id)
                          ? dispatch({ type: 'GO_TO', screen: 'noHearts' })
                          : dispatch({ type: 'START_LESSON', lessonId: lesson.id })
                      }
                      style={({ pressed }) => [
                        styles.stone,
                        complete
                          ? styles.stoneDone
                          : open
                            ? { backgroundColor: tone.fill, borderBottomColor: tone.edge }
                            : styles.stoneLocked,
                        sink(pressed && open, edge.stone),
                      ]}
                    >
                      <Icon
                        name={complete ? 'star' : open ? lesson.icon : 'lock'}
                        size={34}
                        tint={complete ? color.onSecondaryContainer : open ? tone.on : '#98a2ae'}
                      />
                    </Pressable>

                    <Text style={styles.stoneLabel}>{open ? lesson.title : t('home.locked')}</Text>
                  </View>
                );
              })}

              <View
                style={[
                  styles.stop,
                  { width: P.goal, top: cy(stops - 1) - P.goal / 2, left: cx(stops - 1) - P.goal / 2 },
                ]}
              >
                <Pressable
                  accessibilityLabel={`${unit.title} reward, ${cleared ? 'unlocked' : 'locked until every lesson is cleared'}`}
                  accessibilityRole="button"
                  disabled={!cleared}
                  style={({ pressed }) => [styles.goal, sink(pressed && cleared, edge.stone)]}
                >
                  <Icon name={cleared ? 'redeem' : 'lock'} size={40} tint={color.onSecondaryFixed} />
                </Pressable>
                <Text style={styles.stoneLabel}>
                  {cleared ? t('home.unitCleared') : t('home.unitReward')}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  unit: {
    marginHorizontal: space.screen,
    marginBottom: 24,
    minHeight: 128,
    justifyContent: 'center',
    padding: space.md,
    borderRadius: radius.base,
    borderBottomWidth: edge.card,
    overflow: 'hidden',
  },
  unitKicker: { ...type.labelSm, marginBottom: 4, opacity: 0.9 },
  unitTitle: { ...type.title },
  unitText: { ...type.bodySm, marginTop: 2, paddingRight: 72 },
  unitMark: { position: 'absolute', right: -18, bottom: -22, width: 118, height: 141, opacity: 0.22 },
  path: { alignSelf: 'center', width: P.width, position: 'relative' },
  track: { position: 'absolute', top: 0, left: 0 },
  stop: { position: 'absolute', width: P.stone, alignItems: 'center' },
  ring: { position: 'absolute', top: -9, left: -9 },
  stone: {
    width: P.stone,
    height: P.stone,
    borderRadius: P.stone / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: color.surface,
    borderBottomWidth: edge.stone,
  },
  stoneDone: { backgroundColor: color.secondaryContainer, borderBottomColor: color.secondaryEdge },
  stoneLocked: { backgroundColor: color.surfaceHighest, borderBottomColor: color.lockedEdge },
  stoneLabel: {
    ...type.labelSm,
    position: 'absolute',
    top: P.stone + 8,
    left: (P.stone - 132) / 2,
    width: 132,
    color: color.onSurfaceVariant,
    textAlign: 'center',
  },
  goal: {
    width: P.goal,
    height: P.goal,
    borderRadius: radius.base,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: color.surface,
    borderBottomWidth: edge.stone,
    borderBottomColor: color.secondaryEdge,
    backgroundColor: color.secondaryFixed,
  },
  cheer: {
    position: 'absolute',
    top: -6,
    width: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    backgroundColor: color.surfaceLowest,
  },
  cheerLeft: { right: P.stone + 14 },
  cheerRight: { left: P.stone + 14 },
  cheerMark: { width: 22, height: 27 },
  cheerText: { ...type.labelSm, flex: 1, color: color.onSurfaceVariant },
});
