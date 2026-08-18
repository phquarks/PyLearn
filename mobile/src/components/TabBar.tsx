import { BlurView } from 'expo-blur';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, type } from '../theme';
import type { Screen } from '../state/store';
import { Icon } from './ui';

export const TABS: { screen: Screen; icon: string; label: string }[] = [
  { screen: 'home', icon: 'home', label: 'Home' },
  // leaderboard and bar-chart both read as bars at 24pt; keep the two apart
  { screen: 'progress', icon: 'trending-up', label: 'Progress' },
  // the character sits in the middle of the five, where a thumb lands easiest
  { screen: 'customize', icon: 'pets', label: 'Sneaky' },
  { screen: 'league', icon: 'leaderboard', label: 'League' },
  { screen: 'profile', icon: 'person', label: 'Profile' },
];

const PAD = 7;
/** travel that separates a tap from a drag, in points */
const SLOP = 10;

/**
 * The droplet behind the tabs is a spring, not a transition, so it can be
 * dragged: hold and slide, and it follows the finger, stretching along the
 * direction of travel and settling with a small overshoot on release.
 *
 * A plain tap is not a drag, though. Under the slop the droplet snaps to the
 * tab's own slot, so it always sits centred on the tab rather than tracking
 * wherever inside the tab the finger happened to land.
 *
 * Everything that moves lives on the UI thread as shared values; only the
 * committed tab crosses back to JS.
 */
export function TabBar({
  current,
  onSelect,
}: {
  current: Screen;
  onSelect: (screen: Screen) => void;
}) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const slot = barWidth > 0 ? (barWidth - PAD * 2) / TABS.length : 0;
  const activeIndex = Math.max(
    0,
    TABS.findIndex((tab) => tab.screen === current),
  );

  const x = useSharedValue(0);
  const dragging = useSharedValue(false);
  // a press starts as a tap and only becomes a drag once the finger travels
  const panning = useSharedValue(false);
  const startX = useSharedValue(0);
  const previous = useSharedValue(0);

  // resting position follows the live tab whenever the finger is not down
  useDerivedValue(() => {
    if (!dragging.value && slot > 0) {
      x.value = withSpring(PAD + activeIndex * slot, { damping: 15, stiffness: 190, mass: 0.9 });
    }
  }, [activeIndex, slot]);

  // stretch along travel, thin across it: the droplet read
  const velocity = useSharedValue(0);

  const dropStyle = useAnimatedStyle(() => {
    const stretch = Math.min(0.4, Math.abs(velocity.value) * 0.0016);

    return {
      width: slot,
      transform: [
        { translateX: x.value },
        { scaleX: 1 + stretch },
        { scaleY: 1 - stretch * 0.5 },
      ],
    };
  }, [slot]);

  /** the tab under a touch, taken straight from the finger */
  const slotAt = (touchX: number) => {
    'worklet';
    if (slot <= 0) return 0;
    return Math.min(TABS.length - 1, Math.max(0, Math.floor((touchX - PAD) / slot)));
  };

  /** where the droplet's left edge sits when it is centred on a tab */
  const edgeOf = (index: number) => {
    'worklet';
    return PAD + index * slot;
  };

  const commit = (index: number) => {
    setDragIndex(null);
    const tab = TABS[index];
    if (tab) onSelect(tab.screen);
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((event) => {
      dragging.value = true;
      panning.value = false;
      velocity.value = 0;
      startX.value = event.x;
      previous.value = event.x;
      // A press is a tap until the finger proves otherwise, so the droplet lands
      // squarely on the tab rather than parking wherever the fingertip fell.
      const index = slotAt(event.x);
      x.value = withSpring(edgeOf(index), { damping: 22, stiffness: 420, mass: 0.6 });
      runOnJS(setDragIndex)(index);
    })
    .onUpdate((event) => {
      // below the slop the droplet stays snapped, so the small wobble every real
      // finger makes during a tap never drags the glass off the tab
      if (!panning.value) {
        if (Math.abs(event.x - startX.value) < SLOP) return;
        panning.value = true;
        previous.value = event.x;
      }

      velocity.value = event.x - previous.value;
      previous.value = event.x;
      x.value = withSpring(
        Math.min(Math.max(event.x - slot / 2, PAD), edgeOf(TABS.length - 1)),
        { damping: 22, stiffness: 420, mass: 0.6 },
      );
      runOnJS(setDragIndex)(slotAt(event.x));
    })
    .onFinalize((event) => {
      dragging.value = false;
      panning.value = false;
      velocity.value = 0;
      const index = slotAt(event.x);
      x.value = withSpring(edgeOf(index), { damping: 14, stiffness: 200, mass: 0.9 });
      runOnJS(commit)(index);
    });

  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) + 4 }]}
      >
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 0} style={StyleSheet.absoluteFill} tint="light" />
        <View style={styles.tint} />
        {slot > 0 ? <Animated.View style={[styles.drop, dropStyle]} /> : null}

        {TABS.map((tab, index) => {
          const lit = dragIndex === null ? current === tab.screen : dragIndex === index;

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: current === tab.screen }}
              key={tab.screen}
              onPress={() => onSelect(tab.screen)}
              style={styles.tab}
            >
              <Icon name={tab.icon} size={24} tint={lit ? color.onPrimaryContainer : color.onSurfaceVariant} />
              <Text style={[styles.label, { color: lit ? color.onPrimaryContainer : color.onSurfaceVariant }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: PAD,
    borderRadius: radius.nav,
    borderWidth: 1,
    borderColor: color.navHairline,
    // Android has no backdrop blur here, so it falls back to a near-opaque fill
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : color.navGlassSolid,
    overflow: 'hidden',
    shadowColor: color.navShadow,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  tint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // the token, not a copy of it: this wash is what separates pill from page
    backgroundColor: Platform.OS === 'ios' ? color.navGlass : 'transparent',
  },
  drop: {
    position: 'absolute',
    left: 0,
    top: PAD,
    bottom: PAD,
    borderRadius: radius.tab,
    borderWidth: 1,
    borderColor: color.navTabWashEdge,
    backgroundColor: color.navTabWash,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 50,
    borderRadius: radius.tab,
  },
  label: {
    ...type.tab,
  },
});
