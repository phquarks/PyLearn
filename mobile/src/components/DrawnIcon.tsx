import { useEffect } from 'react';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Line art that draws itself, then retracts, on a loop.
 *
 * A font glyph is a filled shape with no line to follow, so these are authored
 * as stroked outlines instead. Each stroke carries its own measured length; the
 * strokes share one 0..1 progress so the pen finishes one before starting the
 * next, which is what reads as a hand drawing rather than a fade.
 *
 * `len` is a deliberately generous approximation of each path's length. Running
 * long only makes a stroke land a touch early, which is invisible; running short
 * would leave the tail undrawn, so every value here rounds up.
 */
type Stroke = {
  d: string;
  len: number;
  /** overrides the drawing's line weight */
  w?: number;
  /** overrides the drawing's colour */
  c?: string;
};
type Drawing = {
  tint: string;
  /** every stroke advances together instead of waiting its turn in the queue */
  parallel?: boolean;
  strokes: Stroke[];
};

export const drawings: Record<string, Drawing> = {
  // a slim capsule body, fins that read as fins, a porthole, and a single plume
  rocket: {
    tint: '#58cc02',
    strokes: [
      { d: 'M50 6 C59 17 64 31 64 45 L64 72 L36 72 L36 45 C36 31 41 17 50 6 Z', len: 190 },
      { d: 'M36 54 L21 77 L36 70', len: 52 },
      { d: 'M64 54 L79 77 L64 70', len: 52 },
      { d: 'M50 36 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0', len: 58 },
      { d: 'M41 74 C41 85 45 92 50 97 C55 92 59 85 59 74', len: 58 },
    ],
  },
  bolt: {
    tint: '#f2b705',
    strokes: [{ d: 'M56 8 L28 54 L46 54 L40 92 L72 44 L52 44 Z', len: 250 }],
  },
  // a licking outer flame with a secondary tongue, and a rounded inner core
  flame: {
    tint: '#ff9600',
    strokes: [
      {
        d: 'M50 95 C31 95 19 81 21 64 C22 53 30 48 34 39 C39 28 43 17 42 5 C52 13 60 23 62 33 C64 28 66 23 66 18 C75 27 80 41 79 56 C78 77 66 95 50 95 Z',
        len: 276,
      },
      {
        d: 'M50 86 C41 86 35 79 36 70 C37 63 42 59 45 52 C48 45 50 40 50 34 C55 43 60 50 62 58 C64 66 62 78 56 83 C54 85 52 86 50 86 Z',
        len: 146,
      },
    ],
  },
  // The loading mark: PyLearn's initials, drawn by two pens at once. Letterforms
  // suit this better than a creature — straight stems and a plain bowl have no
  // organic curvature to kink, which is what spoiled the earlier attempts.
  pl: {
    tint: '#58cc02',
    parallel: true,
    strokes: [
      // P: up the stem, across the top, round the bowl, back to the stem
      { d: 'M20 84 L20 18 L40 18 C55 18 55 50 40 50 L20 50', len: 170, w: 7 },
      // L: down the stem and out along the foot, in the wordmark's navy
      { d: 'M64 18 L64 84 L90 84', len: 100, w: 7, c: '#1f3a5f' },
    ],
  },
  trophy: {
    tint: '#1cb0f6',
    strokes: [
      { d: 'M32 16 L68 16 L66 44 C64 58 58 64 50 64 C42 64 36 58 34 44 Z', len: 170 },
      { d: 'M32 22 C18 22 16 40 30 44', len: 45 },
      { d: 'M68 22 C82 22 84 40 70 44', len: 45 },
      { d: 'M50 64 L50 78', len: 18 },
      { d: 'M34 88 L66 88 L62 78 L38 78 Z', len: 92 },
    ],
  },
};

export function DrawnIcon({
  name,
  size = 168,
  stroke,
  width = 5,
}: {
  name: string;
  size?: number;
  /** overrides the drawing's own colour */
  stroke?: string;
  width?: number;
}) {
  const drawing = drawings[name] ?? drawings.bolt!;
  const strokes = drawing.strokes;
  const tint = stroke ?? drawing.tint;
  // sequential drawings measure progress along the whole queue; parallel ones
  // give every stroke the same 0..1, so two pens run at once
  const total = drawing.parallel
    ? Math.max(...strokes.map((item) => item.len))
    : strokes.reduce((sum, item) => sum + item.len, 0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withRepeat(
      withSequence(
        // draw
        withTiming(1, { duration: drawing.parallel ? 900 : 1500, easing: Easing.inOut(Easing.quad) }),
        // hold the finished drawing, then let it retract the way it came
        withDelay(drawing.parallel ? 500 : 900, withTiming(0, { duration: drawing.parallel ? 650 : 1000, easing: Easing.in(Easing.quad) })),
        withDelay(350, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );
  }, [name, progress, drawing.parallel]);

  let travelled = 0;

  return (
    <Svg height={size} viewBox="0 0 100 100" width={size}>
      {strokes.map((item) => {
        const start = drawing.parallel ? 0 : travelled;
        travelled += item.len;

        return (
          <Segment
            key={item.d}
            len={item.len}
            path={item.d}
            progress={progress}
            start={start}
            parallel={drawing.parallel === true}
            stroke={item.c ?? tint}
            total={total}
            width={item.w ?? width}
          />
        );
      })}
    </Svg>
  );
}

function Segment({
  path,
  len,
  start,
  total,
  progress,
  stroke,
  width,
  parallel,
}: {
  path: string;
  len: number;
  start: number;
  total: number;
  progress: { value: number };
  stroke: string;
  width: number;
  parallel: boolean;
}) {
  const animatedProps = useAnimatedProps(() => {
    // Sequential strokes measure their slice of the shared queue. Parallel ones
    // scale to their own length instead, so a short stroke and a long one start
    // and finish together rather than one idling while the other catches up.
    const drawn = parallel
      ? Math.min(progress.value * len, len)
      : Math.min(Math.max(progress.value * total - start, 0), len);

    return { strokeDashoffset: len - drawn };
  });

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      d={path}
      fill="none"
      stroke={stroke}
      // A gap this large guarantees the dash pattern never repeats. With
      // [len, len] a path longer than the estimate starts a second dash,
      // whose round cap shows up as a stray dot in the hidden state.
      strokeDasharray={[len, 100000]}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={width}
    />
  );
}
