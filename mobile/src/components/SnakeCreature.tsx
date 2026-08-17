import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { cosmeticById } from '../data/cosmetics';
import { Icon } from './ui';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

/* The drawing lives in this box and is scaled to whatever size is asked for. */
const BOX_W = 250;
const BOX_H = 150;
const MID = BOX_H / 2;
const HEAD_X = 176;
const TAIL_X = 24;
const AMPLITUDE = 26;
/** how many crests fit along the body */
const WAVES = 1.5;

/* Points along the centreline, and the body drawn as a run of overlapping
   round-capped strokes. SVG cannot taper a single stroke, so the taper is built
   from segments that each carry their own width — with round caps they blend
   into one continuous tube. */
const SAMPLES = 96;
const SEGMENTS = 12;

function centre(t: number, phase: number) {
  'worklet';
  const x = TAIL_X + t * (HEAD_X - TAIL_X);
  // the crest shrinks towards the head, the way a real snake steers from behind
  const swing = AMPLITUDE * (0.35 + 0.65 * (1 - t));
  const y = MID + swing * Math.sin(t * Math.PI * 2 * WAVES + phase);

  return { x, y };
}

function segmentPath(index: number, phase: number, lift = 0) {
  'worklet';
  const per = SAMPLES / SEGMENTS;
  // one sample of overlap, so neighbouring segments never show a seam
  const from = Math.floor(index * per);
  const to = Math.min(SAMPLES, Math.floor((index + 1) * per) + 1);
  let d = '';

  for (let i = from; i <= to; i += 1) {
    const point = centre(i / SAMPLES, phase);
    const y = point.y - lift;
    d += i === from ? `M ${point.x} ${y}` : ` L ${point.x} ${y}`;
  }

  return d;
}

/** which way the body is heading at t, so the head can look where it is going */
function heading(t: number, phase: number) {
  'worklet';
  const back = centre(t - 0.02, phase);
  const here = centre(t, phase);

  return Math.atan2(here.y - back.y, here.x - back.x);
}

/**
 * The head does not sit on the last point of the body but a little beyond it.
 * Centred on the end, half the skull is buried in the neck; pushing it forward
 * along the heading is what lets a neck show.
 */
const HEAD_LEAD = 13;

function headCentre(phase: number) {
  'worklet';
  const point = centre(1, phase);
  const angle = heading(1, phase);

  return { x: point.x + Math.cos(angle) * HEAD_LEAD, y: point.y + Math.sin(angle) * HEAD_LEAD };
}

/** a point given in head-local coordinates, rotated and dropped into the scene */
function place(px: number, py: number, angle: number, x: number, y: number) {
  'worklet';
  const c = Math.cos(angle);
  const s = Math.sin(angle);

  return { x: px + x * c - y * s, y: py + x * s + y * c };
}

/**
 * The skull: an ellipse pinched towards the front so it reads as a snout rather
 * than a ball. `front` is 1 at the nose and 0 at the back of the jaw, which is
 * what stretches the muzzle forward while narrowing it.
 */
function headOutline(px: number, py: number, angle: number, scale: number) {
  'worklet';
  const steps = 44;
  let d = '';

  for (let k = 0; k < steps; k += 1) {
    const th = (Math.PI * 2 * k) / steps;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const front = Math.max(0, c);
    const point = place(
      px,
      py,
      angle,
      20 * c * (1 + 0.18 * front) * scale,
      14 * s * (1 - 0.45 * front) * scale,
    );

    d += k === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`;
  }

  return `${d} Z`;
}

/** thin at the tail, fullest just behind the head */
function widthAt(index: number) {
  const t = index / (SEGMENTS - 1);

  return 5 + 24 * Math.pow(t, 0.65);
}

/** nudges a hex colour towards white or black; used for the belly and the sheen */
function shade(hex: string, amount: number) {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  const mix = (channel: number) =>
    Math.round(amount > 0 ? channel + (255 - channel) * amount : channel * (1 + amount));

  const r = mix((num >> 16) & 255);
  const g = mix((num >> 8) & 255);
  const b = mix(num & 255);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * The snake, drawn rather than photographed.
 *
 * The old preview tinted the logo PNG, which flattened the artwork and moved
 * not at all. This is built from the wave equation instead, so it slithers, and
 * the volume comes from three passes over the same centreline: a dark underside,
 * the skin colour, and a narrow sheen offset upwards. That reads as a round body
 * without any of the weight of a real 3D renderer.
 */
export function SnakeCreature({
  skinId,
  hatId,
  trailId,
  size = 200,
}: {
  skinId: string;
  hatId: string;
  trailId: string;
  size?: number;
}) {
  const phase = useSharedValue(0);
  const blink = useSharedValue(1);
  const flick = useSharedValue(0);

  useEffect(() => {
    phase.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 3200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [phase]);

  useEffect(() => {
    // a long stare, a quick blink: the pause is what makes it read as alive
    blink.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600 }),
        withTiming(0.1, { duration: 90 }),
        withTiming(1, { duration: 110 }),
      ),
      -1,
      false,
    );
  }, [blink]);

  useEffect(() => {
    flick.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1500 }),
        withTiming(1, { duration: 160 }),
        withTiming(0.15, { duration: 120 }),
        withTiming(1, { duration: 140 }),
        withTiming(0, { duration: 200 }),
      ),
      -1,
      false,
    );
  }, [flick]);

  const skin = cosmeticById(skinId)?.swatch ?? '#58cc02';
  const hat = cosmeticById(hatId);
  const trail = cosmeticById(trailId);

  const belly = shade(skin, -0.4);
  const sheen = shade(skin, 0.55);

  const height = (size * BOX_H) / BOX_W;

  return (
    <View style={{ width: size, height }}>
      <Svg height={height} viewBox={`0 0 ${BOX_W} ${BOX_H}`} width={size}>
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <Body index={index} key={index} phase={phase} sheen={sheen} shadow={belly} skin={skin} />
        ))}

        <Head blink={blink} flick={flick} phase={phase} sheen={sheen} shadow={belly} skin={skin} />
      </Svg>

      {trail && trail.icon && trail.id !== 'plain' ? (
        <Trail color={trail.swatch} glyph={trail.icon} height={height} phase={phase} size={size} />
      ) : null}

      {hat && hat.icon && hat.id !== 'none' ? (
        <Hat color={hat.swatch} glyph={hat.icon} height={height} phase={phase} size={size} />
      ) : null}
    </View>
  );
}

function Body({
  index,
  phase,
  skin,
  shadow,
  sheen,
}: {
  index: number;
  phase: { value: number };
  skin: string;
  shadow: string;
  sheen: string;
}) {
  const width = widthAt(index);
  const props = useAnimatedProps(() => ({ d: segmentPath(index, phase.value) }));
  // the sheen rides the same line, lifted just enough to sit on the upper curve
  const sheenProps = useAnimatedProps(() => ({ d: segmentPath(index, phase.value, width * 0.22) }));

  return (
    <>
      <AnimatedPath
        animatedProps={props}
        fill="none"
        stroke={shadow}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={width + 3}
      />
      <AnimatedPath
        animatedProps={props}
        fill="none"
        stroke={skin}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={width}
      />
      <AnimatedPath
        animatedProps={sheenProps}
        fill="none"
        opacity={0.45}
        stroke={sheen}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={Math.max(2, width * 0.3)}
      />
    </>
  );
}

function Head({
  phase,
  skin,
  shadow,
  sheen,
  blink,
  flick,
}: {
  phase: { value: number };
  skin: string;
  shadow: string;
  sheen: string;
  blink: { value: number };
  flick: { value: number };
}) {
  const outline = useAnimatedProps(() => {
    const point = headCentre(phase.value);

    return { d: headOutline(point.x, point.y, heading(1, phase.value), 1.07) };
  });
  const skull = useAnimatedProps(() => {
    const point = headCentre(phase.value);

    return { d: headOutline(point.x, point.y, heading(1, phase.value), 1) };
  });

  // the sheen is a stubby round-capped stroke rather than an ellipse, so it
  // turns with the head for free instead of needing its own rotation
  const gleam = useAnimatedProps(() => {
    const point = headCentre(phase.value);
    const angle = heading(1, phase.value);
    const a = place(point.x, point.y, angle, -10, -6.5);
    const b = place(point.x, point.y, angle, -2, -6.5);

    return { d: `M ${a.x} ${a.y} L ${b.x} ${b.y}` };
  });

  /* Out and back, with a long wait between: a snake tastes the air in flicks,
     and a tongue that hangs out permanently reads as a lizard. */
  const tongue = useAnimatedProps(() => {
    const point = headCentre(phase.value);
    const angle = heading(1, phase.value);
    const out = flick.value;
    const root = place(point.x, point.y, angle, 21, 0);
    const split = place(point.x, point.y, angle, 21 + 11 * out, 0);
    const left = place(point.x, point.y, angle, 21 + 11 * out + 7, -6 * out);
    const right = place(point.x, point.y, angle, 21 + 11 * out + 7, 6 * out);

    return {
      d:
        `M ${root.x} ${root.y} L ${split.x} ${split.y}` +
        ` M ${split.x} ${split.y} L ${left.x} ${left.y}` +
        ` M ${split.x} ${split.y} L ${right.x} ${right.y}`,
      opacity: out,
    };
  });

  return (
    <>
      <AnimatedPath animatedProps={tongue} stroke="#e5484d" strokeLinecap="round" strokeWidth={3} />
      <AnimatedPath animatedProps={outline} fill={shadow} />
      <AnimatedPath animatedProps={skull} fill={skin} />
      <AnimatedPath
        animatedProps={gleam}
        opacity={0.4}
        stroke={sheen}
        strokeLinecap="round"
        strokeWidth={6}
      />

      <Eye blink={blink} phase={phase} side={-1} />
      <Eye blink={blink} phase={phase} side={1} />
      <Nostril phase={phase} shadow={shadow} side={-1} />
      <Nostril phase={phase} shadow={shadow} side={1} />
    </>
  );
}

function Eye({ phase, side, blink }: { phase: { value: number }; side: number; blink: { value: number } }) {
  const white = useAnimatedProps(() => {
    const point = headCentre(phase.value);
    const spot = place(point.x, point.y, heading(1, phase.value), 5, 6.4 * side);

    return { cx: spot.x, cy: spot.y, ry: 3.9 * blink.value };
  });
  const pupil = useAnimatedProps(() => {
    const point = headCentre(phase.value);
    const spot = place(point.x, point.y, heading(1, phase.value), 6.4, 6.4 * side);

    return { cx: spot.x, cy: spot.y, r: 2 * blink.value };
  });

  return (
    <>
      <AnimatedEllipse animatedProps={white} fill="#ffffff" rx={4.3} />
      <AnimatedCircle animatedProps={pupil} fill="#12202c" />
    </>
  );
}

function Nostril({ phase, side, shadow }: { phase: { value: number }; side: number; shadow: string }) {
  const props = useAnimatedProps(() => {
    const point = headCentre(phase.value);
    const spot = place(point.x, point.y, heading(1, phase.value), 17, 2.6 * side);

    return { cx: spot.x, cy: spot.y };
  });

  return <AnimatedCircle animatedProps={props} fill={shadow} r={1.2} />;
}

/** the hat rides the head, so it needs the same wave the drawing uses */
function Hat({
  glyph,
  color,
  phase,
  size,
  height,
}: {
  glyph: string;
  color: string;
  phase: { value: number };
  size: number;
  height: number;
}) {
  const scale = size / BOX_W;
  const style = useAnimatedStyle(() => {
    const point = headCentre(phase.value);

    return {
      transform: [
        { translateX: (point.x - 18) * scale },
        { translateY: (point.y - 44) * (height / BOX_H) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.attached, { backgroundColor: color }, style]}>
      <Icon name={glyph} size={20} tint="#ffffff" />
    </Animated.View>
  );
}

/** puffs behind the tail, fading as they fall back */
function Trail({
  glyph,
  color,
  phase,
  size,
  height,
}: {
  glyph: string;
  color: string;
  phase: { value: number };
  size: number;
  height: number;
}) {
  return (
    <>
      {[0, 1, 2].map((step) => (
        <Puff color={color} glyph={glyph} height={height} key={step} phase={phase} size={size} step={step} />
      ))}
    </>
  );
}

function Puff({
  glyph,
  color,
  phase,
  size,
  height,
  step,
}: {
  glyph: string;
  color: string;
  phase: { value: number };
  size: number;
  height: number;
  step: number;
}) {
  const scale = size / BOX_W;
  const style = useAnimatedStyle(() => {
    // sampled a little further back along the same wave for each puff, so the
    // trail follows the body rather than floating in a straight line
    const point = centre(-0.06 * (step + 1), phase.value);

    return {
      opacity: 0.65 - step * 0.18,
      transform: [
        { translateX: (point.x - 10) * scale },
        { translateY: (point.y - 10) * (height / BOX_H) },
        { scale: 1 - step * 0.18 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.puff, style]}>
      <Icon name={glyph} size={18} tint={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  attached: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puff: { position: 'absolute', top: 0, left: 0 },
});
