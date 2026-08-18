import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, edge, radius, space, type } from '../theme';
import { lessons, unitDone, units } from '../data/lessons';
import { reportProfile } from '../api/moderation';
import { dayBefore, getErrorMessage, today, type ActivityDay, type LeaderboardRow } from '../api/progress';
import type { Action, State } from '../state/store';
import { ChunkyButton, Icon, Note, sink } from '../components/ui';

const MARK = require('../../assets/logo-mark.png');

function useScrollPadding() {
  const insets = useSafeAreaInsets();

  return {
    paddingTop: 68 + insets.top + 16,
    paddingBottom: 120 + insets.bottom,
    paddingHorizontal: space.screen,
  };
}

export function ResultScreen({ state, dispatch }: { state: State; dispatch: (action: Action) => void }) {
  const insets = useSafeAreaInsets();
  const result = state.lastResult;
  // the reward is the server's answer, so there is a moment before it arrives
  const waiting = state.pendingAward !== null;

  return (
    <View style={[styles.screen, styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.resultMark}>
        <Image source={MARK} style={{ width: 96, height: 115 }} />
      </View>
      <Text style={styles.display}>Lesson complete!</Text>
      <Text style={styles.sub}>
        {(waiting ? state.pendingAward?.title : result?.title) ?? 'Python Basics'} just got closer.
      </Text>

      <View style={styles.resultGrid}>
        <View style={styles.statCard}>
          <Icon name="diamond" size={26} tint={color.tertiary} />
          <Text style={styles.statValue}>{waiting ? '···' : `+${result?.xp ?? 0}`}</Text>
          <Text style={styles.statLabel}>XP earned</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="track-changes" size={26} tint={color.primary} />
          <Text style={styles.statValue}>
            {(waiting ? state.pendingAward?.accuracy : result?.accuracy) ?? 0}%
          </Text>
          <Text style={styles.statLabel}>accuracy</Text>
        </View>
      </View>

      {state.syncMessage ? <Note tone="error">{state.syncMessage}</Note> : null}

      <ChunkyButton
        disabled={waiting}
        label={waiting ? 'Saving...' : 'Back to the path'}
        onPress={() => dispatch({ type: 'GO_TO', screen: 'home' })}
        style={{ alignSelf: 'stretch', marginTop: space.md }}
      />
    </View>
  );
}

export function ProgressScreen({ state, activity }: { state: State; activity: ActivityDay[] }) {
  const pad = useScrollPadding();

  // the last seven calendar days, oldest first, filled in from the day log
  const earned = new Map(activity.map((row) => [row.day, row.xp]));
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = dayBefore(today(), 6 - index);
    const date = new Date(`${day}T00:00:00`);

    return {
      day,
      xp: earned.get(day) ?? 0,
      label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()] ?? '',
    };
  });
  const peak = Math.max(...week.map((entry) => entry.xp), 1);
  const weekTotal = week.reduce((sum, entry) => sum + entry.xp, 0);

  return (
    <ScrollView contentContainerStyle={pad} style={styles.screen}>
      <Text style={styles.display}>Progress</Text>
      <Text style={styles.sub}>
        {state.completedLessons.length} of {lessons.length} lessons completed · {weekTotal} XP this week
      </Text>

      <View style={styles.chart}>
        {week.map((entry) => (
          <View key={entry.day} style={styles.barColumn}>
            <Text style={styles.barValue}>{entry.xp || ''}</Text>
            {/* The bar is a share of this track, not of the whole column. Sized
                against the column it counted the two labels and the gaps as
                space it could fill, so a full day pushed out through the top. */}
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  // an empty day still shows a sliver, so the week reads as seven days
                  { height: `${entry.xp ? Math.max(8, (entry.xp / peak) * 100) : 2}%` },
                  entry.xp ? null : styles.barEmpty,
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{entry.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionHead}>Topics</Text>
      {units.map((unit) => {
        const done = unitDone(unit, state.completedLessons);

        return (
          <View key={unit.id} style={{ gap: 10, marginBottom: 22 }}>
            <View style={styles.unitHead}>
              <Icon name={unit.icon} size={20} tint={color.onSurfaceVariant} />
              <Text style={styles.unitHeadName}>{unit.title}</Text>
              <Text style={styles.unitHeadCount}>
                {done}/{unit.lessons.length}
              </Text>
            </View>

            {unit.lessons.map((lesson) => (
              <View key={lesson.id} style={styles.row}>
                <Icon name={lesson.icon} size={24} tint={color.onSurfaceVariant} />
                <Text style={styles.rowName}>{lesson.title}</Text>
                <Text style={styles.rowValue}>
                  {state.completedLessons.includes(lesson.id) ? 'Done' : 'Ahead'}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

export function LeagueScreen({
  board,
  userId,
  error,
}: {
  board: LeaderboardRow[];
  userId: string;
  error: string;
}) {
  const pad = useScrollPadding();
  const [openRow, setOpenRow] = useState('');
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState('');

  async function report(target: string, name: string) {
    setActionError('');

    try {
      await reportProfile(target, 'Reported from the leaderboard');
      setOpenRow('');
      setNote(`Thanks — ${name} has been sent for review. They stay on the board until an admin looks.`);
    } catch (reportError) {
      setActionError(getErrorMessage(reportError));
    }
  }

  const rankTint = [
    { backgroundColor: color.secondaryContainer, color: color.onSecondaryFixed },
    { backgroundColor: '#dfe3e8', color: '#444b52' },
    { backgroundColor: '#f0c9a4', color: '#6b3f16' },
  ];

  return (
    <ScrollView contentContainerStyle={pad} style={styles.screen}>
      <View style={styles.leagueHero}>
        <View style={styles.trophy}>
          <Icon name="emoji-events" size={36} tint={color.onSecondaryFixed} />
        </View>
        <Text style={styles.display}>Leaderboard</Text>
        <Text style={[styles.sub, { textAlign: 'center' }]}>Everyone learning Python here, ranked by XP.</Text>
      </View>

      {error ? <Note>{error}</Note> : null}
      {note ? <Note>{note}</Note> : null}
      {actionError ? <Note tone="error">{actionError}</Note> : null}

      {!error && board.length === 0 ? (
        <Note>Nobody has earned XP yet. Finish a lesson and you will be first on the board.</Note>
      ) : null}

      {board.length === 1 ? (
        <Note>You are the only learner here so far. The board fills up as other people sign up.</Note>
      ) : null}

      <View style={{ gap: 10 }}>
        {board.map((row, index) => {
          const isMe = row.user_id === userId;

          return (
            <View key={row.user_id}>
              <View style={[styles.row, isMe ? styles.rowMe : null]}>
                <View style={[styles.rank, rankTint[index] ?? null]}>
                  <Text style={[styles.rankText, { color: rankTint[index]?.color ?? color.onSurfaceVariant }]}>
                    {index + 1}
                  </Text>
                </View>
                {/* the mark stands in whenever somebody has not set a picture */}
                <View style={styles.face}>
                  {row.avatar_url ? (
                    <Image source={{ uri: row.avatar_url }} style={styles.faceImage} />
                  ) : (
                    <Image source={MARK} style={{ width: 22, height: 27 }} />
                  )}
                </View>
                <Text numberOfLines={1} style={styles.rowName}>
                  {isMe ? `${row.name} (you)` : row.name}
                </Text>
                <Text style={styles.rowValue}>{row.xp} XP</Text>

                {/* nothing to report about yourself */}
                {isMe ? null : (
                  <Pressable
                    accessibilityLabel={`Options for ${row.name}`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setOpenRow(openRow === row.user_id ? '' : row.user_id)}
                  >
                    <Icon name="more-horiz" size={22} tint={color.onSurfaceVariant} />
                  </Pressable>
                )}
              </View>

              {openRow === row.user_id ? (
                <View style={styles.rowActions}>
                  <Pressable hitSlop={6} onPress={() => void report(row.user_id, row.name)}>
                    <Text style={styles.rowAction}>Report this name or picture</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function ProfileScreen({
  state,
  dispatch,
  userEmail,
  onSignOut,
  isAdmin,
}: {
  state: State;
  dispatch: (action: Action) => void;
  userEmail: string;
  onSignOut: () => void;
  /** decided by the database, not by reading the email here */
  isAdmin: boolean;
}) {
  const pad = useScrollPadding();
  const badges: [string, string, boolean][] = [
    ['local-fire-department', `${state.streak}-day streak`, state.streak > 0],
    ['inventory-2', 'Variables', state.completedLessons.includes(1)],
    ['terminal', 'Output', state.completedLessons.includes(2)],
    ['refresh', 'Loops', state.completedLessons.includes(4)],
    ['workspace-premium', 'Python Master', state.completedLessons.length === lessons.length],
    ['bolt', 'Flawless run', false],
  ];

  return (
    <ScrollView contentContainerStyle={pad} style={styles.screen}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          {state.avatarUri ? (
            <Image source={{ uri: state.avatarUri }} style={styles.avatarImage} />
          ) : (
            <Image source={MARK} style={{ width: 64, height: 77 }} />
          )}
        </View>
        <Text style={styles.profileName}>{state.displayName.trim() || 'Add your name'}</Text>
        <Text style={styles.profileMeta}>{userEmail}</Text>
        <Text style={styles.profileMeta}>
          Learning since {new Date(state.profileStartedAt).toLocaleDateString('en-US')}
        </Text>

        <ChunkyButton
          icon="edit"
          label="Edit profile"
          onPress={() => dispatch({ type: 'GO_TO', screen: 'editProfile' })}
          style={{ alignSelf: 'stretch', marginTop: space.sm }}
          tone="ghost"
        />

        {isAdmin ? (
          <ChunkyButton
            icon="admin-panel-settings"
            label="Admin tools"
            onPress={() => dispatch({ type: 'GO_TO', screen: 'admin' })}
            style={{ alignSelf: 'stretch', marginTop: 10 }}
            tone="tertiary"
          />
        ) : null}
      </View>

      <View style={styles.statsRow}>
        {[
          [state.streak, 'streak'],
          [state.xp, 'XP'],
          [state.completedLessons.length, 'lessons'],
        ].map(([value, label]) => (
          <View key={String(label)} style={[styles.statCard, { flex: 1 }]}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionHead}>Achievements</Text>
      <View style={styles.badges}>
        {badges.map(([icon, title, earned]) => (
          <View key={title} style={[styles.badge, earned ? null : styles.badgeLocked]}>
            <Icon
              name={earned ? icon : 'lock'}
              size={28}
              tint={earned ? color.secondaryEdge : color.surfaceDim}
            />
            <Text style={[styles.badgeText, earned ? null : { color: color.onSurfaceVariant }]}>{title}</Text>
          </View>
        ))}
      </View>

      <ChunkyButton icon="logout" label="Log out" onPress={onSignOut} tone="danger" />
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.screen },
  display: { ...type.display, color: color.onSurface },
  sub: { ...type.bodySm, color: color.onSurfaceVariant, marginBottom: 22, marginTop: 4 },
  unitHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  unitHeadName: { ...type.label, flex: 1, color: color.onSurface },
  unitHeadCount: { ...type.labelSm, color: color.onSurfaceVariant },
  sectionHead: { ...type.section, color: color.onSurface, marginBottom: 12 },
  resultMark: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 3,
    borderColor: color.primaryContainer,
    backgroundColor: color.primaryWashSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  resultGrid: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    borderBottomWidth: edge.card,
    backgroundColor: color.surfaceLowest,
  },
  statValue: { ...type.title, color: color.onSurface },
  statLabel: { ...type.labelSm, color: color.onSurfaceVariant },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    height: 168,
    marginBottom: 22,
    paddingTop: space.sm,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    borderBottomWidth: edge.card,
    backgroundColor: color.surfaceLowest,
  },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 6 },
  // takes whatever the labels leave behind, which is what the bar measures against
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: radius.pill, backgroundColor: color.primaryContainer },
  barLabel: { ...type.labelSm, fontSize: 11, color: color.onSurfaceVariant },
  barValue: { ...type.labelSm, fontSize: 10, color: color.onSurfaceVariant },
  barEmpty: { backgroundColor: color.surfaceHighest },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    borderBottomWidth: edge.card,
    backgroundColor: color.surfaceLowest,
  },
  rowMe: { borderColor: color.primaryContainer, backgroundColor: color.primaryWashSoft },
  rowName: { flex: 1, ...type.label, fontSize: 15, color: color.onSurface },
  face: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    backgroundColor: color.surfaceLow,
  },
  faceImage: { width: 34, height: 34, borderRadius: 17 },
  rowActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  rowAction: { ...type.label, color: color.primary },
  rowValue: { ...type.label, color: color.onSurfaceVariant },
  rank: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surfaceContainer },
  rankText: { ...type.label },
  leagueHero: { alignItems: 'center', marginBottom: 4 },
  trophy: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.secondaryContainer,
    marginBottom: 8,
  },
  profileCard: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    borderBottomWidth: edge.card,
    backgroundColor: color.surfaceLowest,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: color.primaryContainer,
    backgroundColor: color.primaryWashSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  profileName: { ...type.title, fontSize: 20, marginTop: 6, color: color.onSurface, textAlign: 'center' },
  profileMeta: { ...type.labelSm, fontSize: 13, color: color.onSurfaceVariant, textAlign: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  badge: {
    width: '31%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    borderBottomWidth: edge.card,
    backgroundColor: color.surfaceLowest,
  },
  badgeLocked: { backgroundColor: color.surfaceLow },
  badgeText: { ...type.labelSm, fontSize: 11, color: color.onSurface, textAlign: 'center' },
});
