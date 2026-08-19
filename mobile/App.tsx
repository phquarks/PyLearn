import {
  BeVietnamPro_500Medium,
  BeVietnamPro_700Bold,
  useFonts,
} from '@expo-google-fonts/be-vietnam-pro';
import { PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getCurrentSession, signOut, subscribeToAuthChanges } from './src/api/auth';
import { clearAvatar, getAvatar, uploadExistingAvatar } from './src/api/avatar';
import { isAdmin } from './src/api/admin';
import { clearQueue, flushQueue, queueLesson, readQueue } from './src/api/offline';
import {
  askPermission,
  clearReminders,
  getReminderSettings,
  remindersAnswered,
  saveReminderSettings,
  scheduleReminders,
  tidyTimes,
} from './src/api/reminders';
import { hasPin } from './src/api/security';
import {
  getActivity,
  getErrorMessage,
  getLearningProgress,
  completeLesson,
  getGems,
  heartState,
  today,
  loseHeart,
  getLeaderboard,
  getShopPrices,
  patchLearningProgress,
  upsertLearningProgress,
  type ActivityDay,
  type ProfilePatch,
  type LeaderboardRow,
} from './src/api/progress';
import { costsHearts } from './src/data/lessons';
import { DrawnIcon } from './src/components/DrawnIcon';
import { TabBar } from './src/components/TabBar';
import { TopBar } from './src/components/TopBar';
import { AdminScreen } from './src/screens/AdminScreen';
import { BlockedScreen } from './src/screens/BlockedScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { AuthScreen, ChoiceScreen, LanguageScreen, OnboardingScreen } from './src/screens/EntryScreens';
import { LockScreen } from './src/screens/LockScreen';
import { NoHeartsScreen } from './src/screens/NoHeartsScreen';
import { PinSetupScreen } from './src/screens/PinSetupScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LessonScreen } from './src/screens/LessonScreen';
import { CustomizeScreen, ShopScreen } from './src/screens/SnakeScreens';
import { LeagueScreen, ProfileScreen, ProgressScreen, ResultScreen } from './src/screens/TabScreens';
import { translate } from './src/i18n';
import { TextProvider, useText } from './src/i18n/useText';
import { initialState, reducer, type Screen, type State } from './src/state/store';
import { color } from './src/theme';

const CHROME: Screen[] = ['home', 'progress', 'customize', 'league', 'profile'];

export default function App() {
  return (
    <TextProvider>
      <PyLearn />
    </TextProvider>
  );
}

function PyLearn() {
  const { language } = useText();
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    BeVietnamPro_500Medium,
    BeVietnamPro_700Bold,
  });
  const [state, dispatch] = useReducer(reducer, initialState);
  const [session, setSession] = useState<Session | null>(null);
  const [progressReady, setProgressReady] = useState(false);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [boardError, setBoardError] = useState('');
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [admin, setAdmin] = useState(false);
  const [pinOn, setPinOn] = useState(false);
  const [pinChecked, setPinChecked] = useState(false);
  const [locked, setLocked] = useState(true);
  const pendingRef = useRef<State['pendingAward']>(null);
  const heartLossRef = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Read by the balance refresh above. Refs rather than dependencies: it must
     see the current values without being torn down and rebuilt by them. */
  const gemsNow = useRef(state.gems);
  const savePending = useRef(false);
  /* What the server is known to hold, and what a failed save was carrying.
     The first is what changes are measured against; the second is kept so the
     attempt can be repeated, since otherwise a name changed offline would wait
     for the next unrelated edit. */
  const savedProfile = useRef<ProfilePatch | null>(null);
  const unsavedPatch = useRef<ProfilePatch | null>(null);
  const userId = session?.user.id;

  // restore a stored session, then follow sign-in and sign-out
  useEffect(() => {
    let alive = true;

    getCurrentSession()
      .then((restored) => {
        if (alive) setSession(restored);
      })
      .catch(() => undefined);

    return subscribeToAuthChanges((_event, next) => {
      setSession(next);
      if (!next) setProgressReady(false);
    });
  }, []);

  /* The avatar is device-local and is read once. */
  useEffect(() => {
    let alive = true;

    void getAvatar().then((uri) => {
      if (alive && uri) dispatch({ type: 'SET_AVATAR', uri });
    });

    void Promise.all([getReminderSettings(), remindersAnswered()]).then(([settings, answered]) => {
      if (!alive) return;
      dispatch({ type: 'SET_REMINDERS', on: settings.on, times: settings.times, answered });
    });

    return () => {
      alive = false;
    };
  }, []);

  /* Whether a PIN exists is a question about the account, not the phone, so it
     is asked again whenever the account changes — switching to another learner
     and back must not look like the PIN was lost. `pinChecked` gates the app
     until the answer arrives, or the path would flash past the lock. */
  useEffect(() => {
    let alive = true;

    setPinChecked(false);

    if (!userId) {
      setPinOn(false);
      setLocked(false);

      return;
    }

    void hasPin(userId).then((exists) => {
      if (!alive) return;
      setPinOn(exists);
      setLocked(exists);
      setPinChecked(true);
    });

    return () => {
      alive = false;
    };
  }, [userId]);

  /* Re-lock when the app actually leaves the screen. 'inactive' is deliberately
     ignored: it also fires for a notification banner or the app switcher peek,
     and locking on those would be a nuisance rather than a protection. */
  useEffect(() => {
    if (!pinOn) return;

    const listener = AppState.addEventListener('change', (next) => {
      if (next === 'background') setLocked(true);
    });

    return () => listener.remove();
  }, [pinOn]);

  const refreshPinState = useCallback(async () => {
    if (!userId) return;

    setPinOn(await hasPin(userId));
    setPinChecked(true);
  }, [userId]);

  // pull saved progress once per signed-in user
  useEffect(() => {
    if (!userId) return;

    let alive = true;

    // What sign-up stashed on the auth user. It is the only copy of the name
    // when confirmation is on, since no profile row exists until the first save.
    const meta = session?.user.user_metadata?.display_name;
    const metaName = typeof meta === 'string' ? meta : '';

    getLearningProgress(userId)
      .then((row) => {
        if (!alive) return;

        if (row) {
          dispatch({
            type: 'HYDRATE_PROGRESS',
            progress: {
              goal: row.goal ?? '',
              experience: row.experience ?? '',
              language: row.language,
              xp: row.xp,
              streak: row.streak,
              hearts: row.hearts,
              gems: row.gems ?? 0,
              ownedItems: row.owned_items ?? [],
              snakeSkin: row.snake_skin || 'green',
              snakeHat: row.snake_hat || 'none',
              snakeTrail: row.snake_trail || 'plain',
              avatarUrl: row.avatar_url ?? '',
              profileHidden: row.profile_hidden ?? false,
              blocked: Boolean(row.blocked_at),
              blockedReason: row.blocked_reason ?? '',
              completedLessons: row.completed_lessons ?? [],
              profileStartedAt: row.started_at,
              // a hidden profile has no name to restore, and pushing the old
              // one back is exactly what undid the moderation before
              displayName: row.profile_hidden ? '' : row.display_name || metaName,
            },
          });
          // what the server holds, so the first patch measures against it
          savedProfile.current = {
            display_name: row.display_name,
            goal: row.goal,
            experience: row.experience,
            language: row.language,
            snake_skin: row.snake_skin,
            snake_hat: row.snake_hat,
            snake_trail: row.snake_trail,
            avatar_url: row.avatar_url,
          };
        } else {
          /* No row yet. A patch is an update and would touch nothing, so the
             row is created once here; everything after this is a patch. */
          void upsertLearningProgress({
            user_id: userId,
            display_name: metaName || null,
            goal: null,
            experience: null,
            language: 'Python',
            xp: 0,
            streak: 0,
            hearts: 5,
            gems: 0,
            owned_items: [],
            snake_skin: 'green',
            snake_hat: 'none',
            snake_trail: 'plain',
            avatar_url: null,
            profile_hidden: false,
            blocked_at: null,
            blocked_reason: null,
            completed_lessons: [],
          })
            .then(() => {
              savedProfile.current = {
                display_name: metaName || null,
                goal: null,
                experience: null,
                language: 'Python',
                snake_skin: 'green',
                snake_hat: 'none',
                snake_trail: 'plain',
                avatar_url: null,
              };
            })
            .catch(() => undefined);

          if (metaName) {
            dispatch({ type: 'SET_DISPLAY_NAME', name: metaName });
          }
        }

        // A saved profile means the intake questions were already answered, so
        // a returning learner goes straight to the path. Only an account with no
        // row, or one abandoned before picking a goal, still needs asking.
        if (!row || !row.goal) {
          dispatch({ type: 'GO_TO', screen: 'goal' });
        }

        setProgressReady(true);
      })
      .catch((error) => {
        if (!alive) return;
        dispatch({ type: 'SET_SYNC_MESSAGE', message: `Progress is device-only for now: ${getErrorMessage(error)}` });
        setProgressReady(true);
      });

    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    gemsNow.current = state.gems;
  }, [state.gems]);

  /* Only what changed goes back, and only once the server's copy is known.
     The whole row used to be posted on every edit, so a second device could
     write its stale copy over everything the first had just changed. */
  useEffect(() => {
    if (!userId || !progressReady) return;

    const current: ProfilePatch = {
      display_name: state.displayName || null,
      goal: state.goal || null,
      experience: state.experience || null,
      language: state.language,
      snake_skin: state.snakeSkin,
      snake_hat: state.snakeHat,
      snake_trail: state.snakeTrail,
      avatar_url: state.avatarUrl || null,
    };

    const saved = savedProfile.current;
    const patch: ProfilePatch = {};

    for (const key of Object.keys(current) as (keyof ProfilePatch)[]) {
      if (!saved || saved[key] !== current[key]) {
        // the cast is safe: key and value come from the same object
        (patch as Record<string, unknown>)[key] = current[key];
      }
    }

    if (Object.keys(patch).length === 0) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);

    savePending.current = true;
    saveTimer.current = setTimeout(() => {
      patchLearningProgress(userId, patch)
        .then(() => {
          savedProfile.current = current;
          unsavedPatch.current = null;
        })
        .catch((error) => {
          unsavedPatch.current = patch;
          dispatch({ type: 'SET_SYNC_MESSAGE', message: `Could not save profile: ${getErrorMessage(error)}` });
        })
        .finally(() => {
          savePending.current = false;
        });
    }, 700);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [
    userId,
    progressReady,
    state.displayName,
    state.goal,
    state.experience,
    state.language,
    state.snakeSkin,
    state.snakeHat,
    state.snakeTrail,
    state.avatarUrl,
  ]);

  /* Coming back to the app re-reads the balance, so an admin grant reaches a
     phone that is already open.

     Two things keep this from fighting the learner. It listens for the app
     waking up rather than for the balance changing — depending on state.gems
     re-ran it on every purchase, and since the save is debounced the server
     still held the old, larger number, so spending was immediately undone. And
     it stands down while a save is in flight, because during that window the
     server is knowingly behind. */
  useEffect(() => {
    if (!userId) return;

    const adopt = async () => {
      if (savePending.current) return;

      const server = await getGems(userId);

      // only upwards: a stale read must never claw back gems just spent
      if (server !== null && server > gemsNow.current) {
        dispatch({ type: 'SET_GEMS', gems: server });
      }
    };

    void adopt();

    const listener = AppState.addEventListener('change', (next) => {
      if (next === 'active') void adopt();
    });

    return () => listener.remove();
  }, [userId]);

  /* Whether this account is an admin comes from the server. Comparing the
     session email here would be a lie of convenience: it would hide the button
     from other people while the database still had to be the thing that
     refuses them. */
  useEffect(() => {
    if (!userId) {
      setAdmin(false);
      return;
    }

    let alive = true;

    void isAdmin().then((yes) => {
      if (alive) setAdmin(yes);
    });

    return () => {
      alive = false;
    };
  }, [userId]);

  // the shop shows what the database will charge, not what the bundle guessed
  useEffect(() => {
    if (!userId) return;

    void getShopPrices()
      .then((fetched) => {
        if (Object.keys(fetched).length) setPrices(fetched);
      })
      .catch(() => undefined);
  }, [userId]);

  const refreshActivity = useCallback(
    async (id: string) => {
      // only the chart: the streak is the server's answer now, not a local count
      setActivity(await getActivity(id));
    },
    [],
  );

  const refreshBoard = useCallback(async () => {
    try {
      setBoard(await getLeaderboard());
      setBoardError('');
    } catch (error) {
      setBoardError(getErrorMessage(error));
    }
  }, []);

  // the day log drives both the chart and the streak, so it loads with the profile
  useEffect(() => {
    if (!userId) {
      setActivity([]);
      setBoard([]);
      return;
    }

    void refreshActivity(userId).catch(() => undefined);
    void refreshBoard();
  }, [userId, refreshActivity, refreshBoard]);

  /* A picture set before the League showed faces lives only on this phone. Once
     the profile is loaded and it turns out the server has none, the local copy
     is sent up — quieter than telling the learner to pick the same photo twice. */
  useEffect(() => {
    if (!userId || !progressReady) return;
    if (!state.avatarUri || state.avatarUrl || state.profileHidden) return;

    void uploadExistingAvatar(userId)
      .then((url) => {
        if (url) dispatch({ type: 'SET_AVATAR', uri: state.avatarUri, url });
      })
      .catch(() => undefined);
  }, [userId, progressReady, state.avatarUri, state.avatarUrl, state.profileHidden]);

  /* The queue is rebuilt from the streak and from whether today is already done.
     Both change when a lesson is finished, which is exactly when today's
     reminder should stop being scheduled. */
  const practisedToday = activity.some((entry) => entry.day === today() && entry.lessons > 0);

  useEffect(() => {
    if (!state.remindersOn) return;

    void scheduleReminders(
      { on: true, times: state.reminderTimes },
      state.streak,
      practisedToday,
    ).catch(() => undefined);
    // the joined string keeps the effect from re-running on an identical array
  }, [state.remindersOn, state.reminderTimes.join(','), state.streak, practisedToday]);

  const setReminders = useCallback(async (on: boolean, times: string[]) => {
    // permission is asked only when switching on, and a refusal is taken as a no
    const allowed = on ? await askPermission() : false;
    const settled = on && allowed;
    const tidy = tidyTimes(times);

    await saveReminderSettings({ on: settled, times: tidy });
    dispatch({ type: 'SET_REMINDERS', on: settled, times: tidy, answered: true });

    if (!settled) {
      await scheduleReminders({ on: false, times: tidy }, 0, true).catch(() => undefined);
    }
  }, []);

  const refreshHearts = useCallback(async () => {
    try {
      const state = await heartState();
      dispatch({ type: 'APPLY_HEARTS', hearts: state.hearts, nextAt: state.next_at ?? '' });
    } catch {
      /* the profile already carries a last-known count; a failed check is not
         worth an error in the learner's face */
    }
  }, []);

  // hearts accrue while the app is closed, so the count is read on the way in
  useEffect(() => {
    if (!userId || !progressReady) return;

    void refreshHearts();

    const listener = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshHearts();
    });

    return () => listener.remove();
  }, [userId, progressReady, refreshHearts]);

  /* A wrong answer spends its heart on the server, which is also where the
     refill clock lives. The reducer only asked; this is the asking answered. */
  useEffect(() => {
    if (!userId || state.pendingHeartLoss === heartLossRef.current) return;

    heartLossRef.current = state.pendingHeartLoss;

    if (state.pendingHeartLoss === 0) return;

    void loseHeart()
      .then((next) => {
        dispatch({ type: 'APPLY_HEARTS', hearts: next.hearts, nextAt: next.next_at ?? '' });
      })
      .catch((error) => {
        dispatch({ type: 'SET_SYNC_MESSAGE', message: getErrorMessage(error) });
      });
  }, [state.pendingHeartLoss, userId]);

  /* Running out mid-lesson ends it. Checked here rather than in the lesson
     screen because the count that matters is the server's answer, which arrives
     a moment after the wrong answer that caused it. */
  useEffect(() => {
    if (state.screen !== 'lesson' || state.hearts > 0 || !state.lesson) return;
    if (!costsHearts(state.lesson.lessonId)) return;

    dispatch({ type: 'GO_TO', screen: 'noHearts' });
  }, [state.screen, state.hearts, state.lesson]);

  /* A finished run is reported to the server, which decides what it was worth
     and hands back the new totals. When the call cannot be made the run is
     written to disk instead and awarded provisionally, so a lesson done without
     signal is still a lesson done. */
  useEffect(() => {
    const pending = state.pendingAward;

    if (!userId || !pending || pending === pendingRef.current) {
      return;
    }

    pendingRef.current = pending;

    void completeLesson(pending.lessonId, pending.correct, pending.total)
      .then((award) => {
        dispatch({
          type: 'APPLY_AWARD',
          award: {
            xp: award.xp,
            gems: award.gems,
            streak: award.streak,
            completedLessons: award.completed_lessons ?? [],
            awardedXp: award.awarded_xp,
          },
        });

        return refreshActivity(userId);
      })
      .then(() => refreshBoard())
      .catch(async () => {
        await queueLesson({
          lessonId: pending.lessonId,
          correct: pending.correct,
          total: pending.total,
          day: today(),
        });

        const waiting = (await readQueue()).length;

        dispatch({ type: 'QUEUE_AWARD', waiting });
        dispatch({
          type: 'SET_SYNC_MESSAGE',
          message: translate(language, 'common.offlineSaved'),
        });
      });
  }, [state.pendingAward, userId, refreshActivity, refreshBoard]);

  /* Draining the queue. Tried on start, on coming back to the app, and on a
     slow timer while anything is waiting — there is no network event to listen
     for without another dependency, and a lesson sitting unsent is worth a
     request every half minute. */
  const drain = useCallback(async () => {
    if (!userId) return;

    // the profile is retried alongside the lessons; both are waiting on the
    // same thing, and there is no sense having two schedules for one network
    if (unsavedPatch.current) {
      try {
        await patchLearningProgress(userId, unsavedPatch.current);
        unsavedPatch.current = null;
      } catch {
        /* still offline */
      }
    }

    const outcome = await flushQueue();

    if (outcome.award) {
      dispatch({
        type: 'APPLY_AWARD',
        award: {
          xp: outcome.award.xp,
          gems: outcome.award.gems,
          streak: outcome.award.streak,
          completedLessons: outcome.award.completed_lessons ?? [],
          awardedXp: outcome.award.awarded_xp,
        },
      });

      await refreshActivity(userId).catch(() => undefined);
      await refreshBoard();
    }

    dispatch({ type: 'SET_QUEUED', waiting: outcome.left });
  }, [userId, refreshActivity, refreshBoard]);

  useEffect(() => {
    if (!userId || !progressReady) return;

    void readQueue().then((queue) => dispatch({ type: 'SET_QUEUED', waiting: queue.length }));
    void drain().catch(() => undefined);

    const listener = AppState.addEventListener('change', (next) => {
      if (next === 'active') void drain().catch(() => undefined);
    });

    return () => listener.remove();
  }, [userId, progressReady, drain]);

  useEffect(() => {
    if (state.queuedLessons === 0) return;

    const timer = setInterval(() => void drain().catch(() => undefined), 30000);

    return () => clearInterval(timer);
  }, [state.queuedLessons, drain]);

  // standings are stale the moment somebody else practises, so refetch on entry
  useEffect(() => {
    if (state.screen === 'league' && userId) {
      void refreshBoard();
    }
  }, [state.screen, userId, refreshBoard]);

  // Work is usually done in well under a second, which left the monogram as a
  // flash. The loader is held for one full draw instead: a deliberate delay,
  // traded for a transition that reads as a moment rather than a glitch.
  const busy = !fontsLoaded || Boolean(session && !progressReady);
  const [holding, setHolding] = useState(true);

  useEffect(() => {
    if (busy) {
      setHolding(true);
      return;
    }

    const timer = setTimeout(() => setHolding(false), 1100);

    return () => clearTimeout(timer);
  }, [busy]);

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      const reason = getErrorMessage(error);
      // "session missing" means there is nothing left to end, so the local
      // reset should still happen; a real failure keeps the user where they are
      const alreadyGone = /session|missing|not\s*logged/i.test(reason);

      if (!alreadyGone) {
        dispatch({ type: 'SET_SYNC_MESSAGE', message: `Could not log out: ${reason}` });
        return;
      }
    }

    /* The PIN and the picture belong to the person, not to the phone. Leaving
       them behind would lock the next learner out with a code they never chose,
       and hand them somebody else's face. */
    await clearAvatar();
    await clearReminders();
    await clearQueue();
    savedProfile.current = null;
    unsavedPatch.current = null;
    setPinOn(false);
    setLocked(false);
    setPinChecked(false);
    setProgressReady(false);
    setActivity([]);
    setBoard([]);
    pendingRef.current = null;
    dispatch({ type: 'SIGN_OUT' });
  }

  if (busy || holding) {
    return (
      <View style={styles.boot}>
        {/* pure SVG, so it draws even on the first frame when fonts are still loading */}
        <DrawnIcon name="pl" size={160} />
      </View>
    );
  }

  // signed in but the answer has not arrived: hold rather than flash the path
  if (session && !pinChecked) {
    return (
      <View style={styles.boot}>
        <DrawnIcon name="pl" size={160} />
      </View>
    );
  }

  /* A blocked account gets no further. The server refuses it anyway; this is
     so the refusal reads as an answer rather than as everything being broken. */
  if (session && progressReady && state.blocked) {
    return (
      <SafeAreaProvider>
        <BlockedScreen onSignOut={() => void handleSignOut()} reason={state.blockedReason} />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  if (pinOn && locked) {
    return (
      <SafeAreaProvider>
        <LockScreen
          onForgot={() => void handleSignOut()}
          onUnlock={() => setLocked(false)}
          userId={userId ?? ''}
        />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  /* Signed in with no PIN yet: the only way on is to set one. This catches the
     learner who has just registered and equally an older account from before
     the PIN existed. */
  if (session && pinChecked && !pinOn) {
    return (
      <SafeAreaProvider>
        <PinSetupScreen
          userId={userId ?? ''}
          onDone={() => {
            setPinOn(true);
            setLocked(false);
          }}
          onLogOut={() => void handleSignOut()}
        />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  const showsChrome = CHROME.includes(state.screen);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.root}>
          {showsChrome ? <TopBar onGems={() => dispatch({ type: 'GO_TO', screen: 'shop' })} state={state} /> : null}

          <Router
            activity={activity}
            board={board}
            boardError={boardError}
            dispatch={dispatch}
            isAdminUser={admin}
            prices={prices}
            onEnableReminders={(wanted) => void setReminders(wanted, state.reminderTimes)}
            onReminders={(on, times) => void setReminders(on, times)}
            onHeartsRefresh={() => void refreshHearts()}
            onPinChanged={() => void refreshPinState()}
            onSignOut={() => void handleSignOut()}
            session={session}
            setSession={setSession}
            state={state}
          />

          {showsChrome ? (
            <TabBar current={state.screen} onSelect={(screen) => dispatch({ type: 'GO_TO', screen })} />
          ) : null}
        </View>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Router({
  state,
  dispatch,
  session,
  setSession,
  onSignOut,
  onPinChanged,
  onHeartsRefresh,
  onEnableReminders,
  onReminders,
  isAdminUser,
  prices,
  activity,
  board,
  boardError,
}: {
  state: ReturnType<typeof reducer>;
  dispatch: React.Dispatch<Parameters<typeof reducer>[1]>;
  session: Session | null;
  setSession: (session: Session) => void;
  onSignOut: () => void;
  onPinChanged: () => void;
  onHeartsRefresh: () => void;
  onEnableReminders: (wanted: boolean) => void;
  onReminders: (on: boolean, times: string[]) => void;
  isAdminUser: boolean;
  prices: Record<string, number>;
  activity: ActivityDay[];
  board: LeaderboardRow[];
  boardError: string;
}) {
  const { t } = useText();

  switch (state.screen) {
    case 'onboarding':
      return <OnboardingScreen dispatch={dispatch} state={state} />;
    case 'auth':
      return <AuthScreen dispatch={dispatch} onAuthenticated={setSession} state={state} />;
    case 'goal':
      return (
        <ChoiceScreen
          onSelect={(goal) => dispatch({ type: 'SET_GOAL', goal })}
          options={[
            { icon: 'work', title: t('intake.goalWork'), text: t('intake.goalWorkText') },
            { icon: 'school', title: t('intake.goalSchool'), text: t('intake.goalSchoolText') },
            { icon: 'auto-awesome', title: t('intake.goalCurious'), text: t('intake.goalCuriousText') },
            { icon: 'rocket-launch', title: t('intake.goalCareer'), text: t('intake.goalCareerText') },
          ]}
          subtitle={t('intake.goalSub')}
          title={t('intake.goalTitle')}
        />
      );
    case 'experience':
      return (
        <ChoiceScreen
          onSelect={(experience) => dispatch({ type: 'SET_EXPERIENCE', experience })}
          options={[
            { icon: 'eco', title: t('intake.expNew'), text: t('intake.expNewText') },
            { icon: 'extension', title: t('intake.expSome'), text: t('intake.expSomeText') },
            { icon: 'fitness-center', title: t('intake.expConfident'), text: t('intake.expConfidentText') },
          ]}
          subtitle={t('intake.expSub')}
          title={t('intake.expTitle')}
        />
      );
    case 'language':
      return <LanguageScreen dispatch={dispatch} />;
    case 'lesson':
      return <LessonScreen dispatch={dispatch} state={state} />;
    case 'result':
      return (
        <ResultScreen
          dispatch={dispatch}
          onEnableReminders={onEnableReminders}
          state={state}
        />
      );
    case 'progress':
      return <ProgressScreen activity={activity} state={state} />;
    case 'league':
      return (
        <LeagueScreen board={board} error={boardError} userId={session?.user.id ?? ''} />
      );
    case 'profile':
      return (
        <ProfileScreen
          dispatch={dispatch}
          isAdmin={isAdminUser}
          onSignOut={onSignOut}
          state={state}
          userEmail={session?.user.email ?? ''}
        />
      );
    case 'noHearts':
      return <NoHeartsScreen dispatch={dispatch} onRefreshed={onHeartsRefresh} state={state} />;
    case 'admin':
      return <AdminScreen dispatch={dispatch} />;
    case 'editProfile':
      return (
        <EditProfileScreen
          dispatch={dispatch}
          onDeleted={onSignOut}
          onReminders={onReminders}
          onPinChanged={onPinChanged}
          state={state}
          userEmail={session?.user.email ?? ''}
          userId={session?.user.id ?? ''}
        />
      );
    case 'customize':
      return <CustomizeScreen dispatch={dispatch} prices={prices} state={state} />;
    case 'shop':
      return <ShopScreen dispatch={dispatch} prices={prices} state={state} />;
    case 'home':
    default:
      return <HomeScreen dispatch={dispatch} state={state} />;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface },
});
