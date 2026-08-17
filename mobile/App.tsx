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
import { clearAvatar, getAvatar } from './src/api/avatar';
import { isAdmin } from './src/api/admin';
import { clearPin, hasPin } from './src/api/security';
import {
  getActivity,
  getErrorMessage,
  getLearningProgress,
  getGems,
  getLeaderboard,
  recordActivity,
  streakFrom,
  upsertLearningProgress,
  type ActivityDay,
  type LeaderboardRow,
} from './src/api/progress';
import { DrawnIcon } from './src/components/DrawnIcon';
import { TabBar } from './src/components/TabBar';
import { TopBar } from './src/components/TopBar';
import { AdminScreen } from './src/screens/AdminScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { AuthScreen, ChoiceScreen, LanguageScreen, OnboardingScreen } from './src/screens/EntryScreens';
import { LockScreen } from './src/screens/LockScreen';
import { PinSetupScreen } from './src/screens/PinSetupScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LessonScreen } from './src/screens/LessonScreen';
import { CustomizeScreen, ShopScreen } from './src/screens/SnakeScreens';
import { LeagueScreen, ProfileScreen, ProgressScreen, ResultScreen } from './src/screens/TabScreens';
import { initialState, reducer, type Screen, type State } from './src/state/store';
import { color } from './src/theme';

const CHROME: Screen[] = ['home', 'progress', 'league', 'profile'];

export default function App() {
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
  const [admin, setAdmin] = useState(false);
  const [pinOn, setPinOn] = useState(false);
  const [pinChecked, setPinChecked] = useState(false);
  const [locked, setLocked] = useState(true);
  const lastResultRef = useRef<State['lastResult']>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Read by the balance refresh above. Refs rather than dependencies: it must
     see the current values without being torn down and rebuilt by them. */
  const gemsNow = useRef(state.gems);
  const savePending = useRef(false);
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

  /* Whether a PIN exists is read once at start. `locked` begins true so the
     first frame can never flash the path before that answer arrives; if no PIN
     is set it drops immediately and nothing is shown. */
  useEffect(() => {
    let alive = true;

    void hasPin().then((exists) => {
      if (!alive) return;
      setPinOn(exists);
      setLocked(exists);
      setPinChecked(true);
    });

    void getAvatar().then((uri) => {
      if (alive && uri) dispatch({ type: 'SET_AVATAR', uri });
    });

    return () => {
      alive = false;
    };
  }, []);

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
    setPinOn(await hasPin());
    setPinChecked(true);
  }, []);

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
              completedLessons: row.completed_lessons ?? [],
              profileStartedAt: row.started_at,
              displayName: row.display_name || metaName,
            },
          });
        } else if (metaName) {
          dispatch({ type: 'SET_DISPLAY_NAME', name: metaName });
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

  // push changes back, debounced so a burst of taps is one write
  useEffect(() => {
    if (!userId || !progressReady) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);

    savePending.current = true;
    saveTimer.current = setTimeout(() => {
      upsertLearningProgress({
        user_id: userId,
        display_name: state.displayName || null,
        goal: state.goal || null,
        experience: state.experience || null,
        language: state.language,
        xp: state.xp,
        streak: state.streak,
        hearts: state.hearts,
        gems: state.gems,
        owned_items: state.ownedItems,
        snake_skin: state.snakeSkin,
        snake_hat: state.snakeHat,
        snake_trail: state.snakeTrail,
        avatar_url: state.avatarUrl || null,
        completed_lessons: state.completedLessons,
      })
        .catch((error) => {
          dispatch({ type: 'SET_SYNC_MESSAGE', message: `Could not save progress: ${getErrorMessage(error)}` });
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
    state.xp,
    state.streak,
    state.hearts,
    state.gems,
    state.ownedItems,
    state.snakeSkin,
    state.snakeHat,
    state.snakeTrail,
    state.avatarUrl,
    state.completedLessons,
  ]);

  /* The answer comes from the server. Comparing the session email here would
     be a lie of convenience: it would hide the button from other people while
     the database still had to be the thing that refuses them. */
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

  const refreshActivity = useCallback(
    async (id: string) => {
      const rows = await getActivity(id);
      setActivity(rows);
      dispatch({ type: 'SET_STREAK', streak: streakFrom(rows) });
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

  // a finished lesson is the only thing that writes a day into the log
  useEffect(() => {
    const result = state.lastResult;

    if (!userId || !result || result === lastResultRef.current) {
      return;
    }

    lastResultRef.current = result;

    void recordActivity(userId, result.xp)
      .then(() => refreshActivity(userId))
      .then(() => refreshBoard())
      .catch((error) => {
        dispatch({ type: 'SET_SYNC_MESSAGE', message: `Could not log today: ${getErrorMessage(error)}` });
      });
  }, [state.lastResult, userId, refreshActivity, refreshBoard]);

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
    await clearPin();
    await clearAvatar();
    setPinOn(false);
    setLocked(false);
    setProgressReady(false);
    setActivity([]);
    setBoard([]);
    lastResultRef.current = null;
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

  if (pinOn && locked) {
    return (
      <SafeAreaProvider>
        <LockScreen onForgot={() => void handleSignOut()} onUnlock={() => setLocked(false)} />
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
  isAdminUser,
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
  isAdminUser: boolean;
  activity: ActivityDay[];
  board: LeaderboardRow[];
  boardError: string;
}) {
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
            { icon: 'work', title: 'For work', text: 'Automation, data, backend' },
            { icon: 'school', title: 'For school', text: 'Exams, projects, contests' },
            { icon: 'auto-awesome', title: 'Out of curiosity', text: 'Understand how programs are written' },
            { icon: 'rocket-launch', title: 'To switch careers', text: 'A start in development' },
          ]}
          subtitle="We will tune the course to your goal."
          title="Why are you learning Python?"
        />
      );
    case 'experience':
      return (
        <ChoiceScreen
          onSelect={(experience) => dispatch({ type: 'SET_EXPERIENCE', experience })}
          options={[
            { icon: 'eco', title: 'Beginner', text: 'Writing code for the first time' },
            { icon: 'extension', title: 'Know the basics', text: 'Comfortable with variables and conditions' },
            { icon: 'fitness-center', title: 'Confident', text: 'Want to sharpen my Python' },
          ]}
          subtitle="We will keep the first lesson comfortable."
          title="What is your experience?"
        />
      );
    case 'language':
      return <LanguageScreen dispatch={dispatch} />;
    case 'lesson':
      return <LessonScreen dispatch={dispatch} state={state} />;
    case 'result':
      return <ResultScreen dispatch={dispatch} state={state} />;
    case 'progress':
      return <ProgressScreen activity={activity} state={state} />;
    case 'league':
      return <LeagueScreen board={board} error={boardError} userId={session?.user.id ?? ''} />;
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
    case 'admin':
      return <AdminScreen dispatch={dispatch} />;
    case 'editProfile':
      return (
        <EditProfileScreen
          dispatch={dispatch}
          onPinChanged={onPinChanged}
          state={state}
          userEmail={session?.user.email ?? ''}
          userId={session?.user.id ?? ''}
        />
      );
    case 'customize':
      return <CustomizeScreen dispatch={dispatch} state={state} />;
    case 'shop':
      return <ShopScreen dispatch={dispatch} state={state} />;
    case 'home':
    default:
      return <HomeScreen dispatch={dispatch} state={state} />;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface },
});
