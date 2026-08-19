/** App state. Copied from the web build — the reducer is platform-agnostic. */

import { cosmeticById, owns } from '../data/cosmetics';
import { costsHearts, lessons, onboardingSlides } from '../data/lessons';

export type Screen =
  | 'onboarding'
  | 'auth'
  | 'goal'
  | 'experience'
  | 'language'
  | 'home'
  | 'lesson'
  | 'result'
  | 'progress'
  | 'league'
  | 'profile'
  | 'editProfile'
  | 'admin'
  | 'noHearts'
  | 'customize'
  | 'shop';

export type LessonSession = {
  lessonId: number;
  questionIndex: number;
  correct: number;
  answered: boolean;
  isCorrect: boolean | null;
  /* For blocks these are positions in `options`, not the words themselves. Code
     repeats tokens all the time — two + signs, two brackets — and matching by
     text made the second one toggle the first off. */
  selected: string | number[];
  shake: boolean;
};

export type State = {
  screen: Screen;
  displayName: string;
  /** path to the picture in the app's own documents, '' while none is set */
  avatarUri: string;
  /** the same picture on the server, which is what other learners see */
  avatarUrl: string;
  /** an admin removed this profile's name and picture from what others see */
  profileHidden: boolean;
  /** set by an admin; the server refuses this account regardless of the app */
  blocked: boolean;
  blockedReason: string;
  remindersOn: boolean;
  /** times of day as "HH:MM", sorted; several a day is allowed */
  reminderTimes: string[];
  /** whether the learner has been asked about reminders, either way */
  remindersAnswered: boolean;
  /** finished lessons still waiting for a connection */
  queuedLessons: number;
  onboardingIndex: number;
  authMode: 'login' | 'register';
  goal: string;
  experience: string;
  language: string;
  xp: number;
  streak: number;
  hearts: number;
  /** when the next heart lands, or '' while they are full */
  heartsNextAt: string;
  /* Bumped by a wrong answer that should cost a heart. The spending itself
     happens on the server; this is only the nudge that asks for it. */
  pendingHeartLoss: number;
  gems: number;
  /** ids of bought cosmetics; the free ones are never listed here */
  ownedItems: string[];
  snakeSkin: string;
  snakeHat: string;
  snakeTrail: string;
  completedLessons: number[];
  lastResult: { xp: number; accuracy: number; title: string } | null;
  /* A finished run waiting to be reported. The server decides what it was
     worth, so nothing is added to the totals until it answers. */
  pendingAward: { lessonId: number; correct: number; total: number; title: string; accuracy: number } | null;
  lesson: LessonSession | null;
  profileStartedAt: string;
  syncMessage: string;
};

export type Action =
  | { type: 'NEXT_ONBOARDING' }
  | { type: 'GO_TO'; screen: Screen }
  | { type: 'SET_AUTH_MODE'; mode: 'login' | 'register' }
  | { type: 'SET_GOAL'; goal: string }
  | { type: 'SET_EXPERIENCE'; experience: string }
  | { type: 'SET_LANGUAGE'; language: string }
  | { type: 'START_LESSON'; lessonId: number }
  | { type: 'SELECT_ANSWER'; value: string }
  | { type: 'TOGGLE_BLOCK'; index: number }
  | { type: 'CHECK_ANSWER' }
  | { type: 'CONTINUE_LESSON' }
  | { type: 'STOP_SHAKE' }
  | {
      type: 'HYDRATE_PROGRESS';
      progress: {
        goal: string;
        experience: string;
        language: string;
        xp: number;
        streak: number;
        hearts: number;
        gems: number;
        ownedItems: string[];
        snakeSkin: string;
        snakeHat: string;
        snakeTrail: string;
        avatarUrl: string;
        profileHidden: boolean;
        blocked: boolean;
        blockedReason: string;
        completedLessons: number[];
        profileStartedAt?: string;
        displayName?: string;
      };
    }
  | { type: 'SET_SYNC_MESSAGE'; message: string }
  | { type: 'SET_DISPLAY_NAME'; name: string }
  | { type: 'SET_AVATAR'; uri: string; url?: string }
  | { type: 'SET_REMINDERS'; on: boolean; times: string[]; answered: boolean }
  | { type: 'EQUIP_COSMETIC'; id: string }
  | {
      type: 'APPLY_AWARD';
      award: { xp: number; gems: number; streak: number; completedLessons: number[]; awardedXp: number };
    }
  | { type: 'QUEUE_AWARD'; waiting: number }
  | { type: 'SET_QUEUED'; waiting: number }
  | { type: 'APPLY_PURCHASE'; gems: number; ownedItems: string[] }
  | { type: 'APPLY_HEARTS'; hearts: number; nextAt: string; gems?: number }
  | { type: 'SET_GEMS'; gems: number }
  | { type: 'SIGN_OUT' };

export const initialState: State = {
  screen: 'onboarding',
  displayName: '',
  avatarUri: '',
  avatarUrl: '',
  profileHidden: false,
  blocked: false,
  blockedReason: '',
  remindersOn: false,
  reminderTimes: ['19:00'],
  remindersAnswered: false,
  queuedLessons: 0,
  onboardingIndex: 0,
  authMode: 'register',
  goal: '',
  experience: '',
  language: 'Python',
  // a new learner starts empty; anything else is a number the app invented
  xp: 0,
  streak: 0,
  hearts: 5,
  heartsNextAt: '',
  pendingHeartLoss: 0,
  gems: 0,
  ownedItems: [],
  snakeSkin: 'green',
  snakeHat: 'none',
  snakeTrail: 'plain',
  completedLessons: [],
  lastResult: null,
  pendingAward: null,
  lesson: null,
  // local date, not UTC: see isoDate in api/progress for why toISOString lies
  profileStartedAt: (() => {
    const now = new Date();

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`;
  })(),
  syncMessage: '',
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'NEXT_ONBOARDING': {
      if (state.onboardingIndex >= onboardingSlides.length - 1) {
        // finishing the tour means "I am new here", so auth opens on Sign up
        return { ...state, screen: 'auth', authMode: 'register' };
      }

      return { ...state, onboardingIndex: state.onboardingIndex + 1 };
    }
    case 'GO_TO':
      // returning to the welcome flow restarts it from the first slide rather
      // than dropping the user back on the last one they had already passed
      return action.screen === 'onboarding'
        ? { ...state, screen: action.screen, onboardingIndex: 0 }
        : { ...state, screen: action.screen };
    case 'SET_AUTH_MODE':
      return { ...state, authMode: action.mode };
    case 'SET_GOAL':
      return { ...state, goal: action.goal, screen: 'experience' };
    case 'SET_EXPERIENCE':
      return { ...state, experience: action.experience, screen: 'language' };
    case 'SET_LANGUAGE':
      return { ...state, language: action.language, screen: 'home' };
    case 'START_LESSON':
      return {
        ...state,
        screen: 'lesson',
        lesson: {
          lessonId: action.lessonId,
          questionIndex: 0,
          correct: 0,
          answered: false,
          isCorrect: null,
          selected: [],
          shake: false,
        },
      };
    case 'SELECT_ANSWER':
      if (!state.lesson || state.lesson.answered) return state;

      return { ...state, lesson: { ...state.lesson, selected: action.value } };
    case 'TOGGLE_BLOCK':
      if (!state.lesson || state.lesson.answered) return state;

      return {
        ...state,
        lesson: {
          ...state.lesson,
          selected: Array.isArray(state.lesson.selected)
            ? state.lesson.selected.includes(action.index)
              ? state.lesson.selected.filter((slot) => slot !== action.index)
              : [...state.lesson.selected, action.index]
            : [action.index],
        },
      };
    case 'CHECK_ANSWER': {
      if (!state.lesson || state.lesson.answered) return state;

      const lesson = lessons.find((item) => item.id === state.lesson?.lessonId);
      const question = lesson?.questions[state.lesson.questionIndex];
      if (!question) return state;

      const selected = state.lesson.selected;
      const correct =
        question.type === 'blocks'
          ? Array.isArray(selected) &&
            selected.length === question.answer.length &&
            selected.every((slot, index) => question.options[slot] === question.answer[index])
          : selected === question.answer;

      /* The heart is not taken here. Hearts refill on a timer the server keeps,
         so the device counting them down would just be a guess — and one the
         learner could reset by changing their clock. */
      const spends = !correct && costsHearts(state.lesson.lessonId);

      return {
        ...state,
        pendingHeartLoss: state.pendingHeartLoss + (spends ? 1 : 0),
        lesson: {
          ...state.lesson,
          answered: true,
          isCorrect: correct,
          correct: state.lesson.correct + (correct ? 1 : 0),
          shake: !correct,
        },
      };
    }
    case 'CONTINUE_LESSON': {
      if (!state.lesson) return state;

      const currentLesson = lessons.find((lesson) => lesson.id === state.lesson?.lessonId);
      if (!currentLesson) return { ...state, screen: 'home', lesson: null };

      const nextIndex = state.lesson.questionIndex + 1;
      if (nextIndex < currentLesson.questions.length) {
        return {
          ...state,
          lesson: {
            ...state.lesson,
            questionIndex: nextIndex,
            answered: false,
            isCorrect: null,
            selected: [],
            shake: false,
          },
        };
      }

      const accuracy = Math.round((state.lesson.correct / currentLesson.questions.length) * 100);

      /* No xp or gems here. The client used to work out the reward itself and
         write the new totals straight to the database, which meant anyone could
         post themselves any number. The run is parked instead, and the server
         says what it was worth. */
      return {
        ...state,
        screen: 'result',
        lastResult: null,
        pendingAward: {
          lessonId: currentLesson.id,
          correct: state.lesson.correct,
          total: currentLesson.questions.length,
          title: currentLesson.title,
          accuracy,
        },
        lesson: null,
      };
    }
    case 'STOP_SHAKE':
      return state.lesson ? { ...state, lesson: { ...state.lesson, shake: false } } : state;
    case 'HYDRATE_PROGRESS':
      return {
        ...state,
        ...action.progress,
        screen: 'home',
        profileStartedAt: action.progress.profileStartedAt ?? state.profileStartedAt,
        displayName: action.progress.displayName ?? state.displayName,
        syncMessage: '',
      };
    case 'SET_SYNC_MESSAGE':
      return { ...state, syncMessage: action.message };
    case 'SET_DISPLAY_NAME':
      return { ...state, displayName: action.name };
    case 'SET_REMINDERS':
      return {
        ...state,
        remindersOn: action.on,
        reminderTimes: action.times,
        remindersAnswered: action.answered,
      };
    case 'SET_AVATAR':
      return {
        ...state,
        avatarUri: action.uri,
        // an upload that failed leaves the shared copy alone rather than
        // clearing it, so the League keeps the last picture that did land
        avatarUrl: action.url === undefined ? state.avatarUrl : action.url,
      };
    /* Every balance below arrives from the server, already decided. The reducer
       only records what came back — it no longer works out prices or rewards,
       because a client that can do the sums can also lie about them. */
    case 'APPLY_AWARD':
      return {
        ...state,
        xp: action.award.xp,
        gems: action.award.gems,
        streak: action.award.streak,
        completedLessons: action.award.completedLessons,
        lastResult: state.pendingAward
          ? {
              xp: action.award.awardedXp,
              accuracy: state.pendingAward.accuracy,
              title: state.pendingAward.title,
            }
          : state.lastResult,
        pendingAward: null,
      };
    /* No connection, so the reward is worked out here for now. The numbers use
       the same rule the server does, and are replaced by its answer the moment
       the queue drains — an estimate shown as final, then quietly corrected,
       beats a finished lesson that appears not to have happened. */
    case 'QUEUE_AWARD': {
      const pending = state.pendingAward;

      if (!pending) return state;

      const repeat = state.completedLessons.includes(pending.lessonId);
      const fullXp = 10 + pending.correct * 5;
      const earnedXp = repeat ? Math.max(1, Math.floor(fullXp / 3)) : fullXp;
      const earnedGems = repeat ? 0 : 15;

      return {
        ...state,
        xp: state.xp + earnedXp,
        gems: state.gems + earnedGems,
        completedLessons: repeat
          ? state.completedLessons
          : [...state.completedLessons, pending.lessonId],
        lastResult: { xp: earnedXp, accuracy: pending.accuracy, title: pending.title },
        pendingAward: null,
        queuedLessons: action.waiting,
      };
    }
    case 'SET_QUEUED':
      return { ...state, queuedLessons: action.waiting };
    case 'APPLY_PURCHASE':
      return { ...state, gems: action.gems, ownedItems: action.ownedItems };
    case 'APPLY_HEARTS':
      return {
        ...state,
        hearts: action.hearts,
        heartsNextAt: action.nextAt,
        gems: action.gems ?? state.gems,
      };
    case 'EQUIP_COSMETIC': {
      const item = cosmeticById(action.id);

      if (!item || !owns(item, state.ownedItems)) {
        return state;
      }

      const slot =
        item.slot === 'skin' ? 'snakeSkin' : item.slot === 'hat' ? 'snakeHat' : 'snakeTrail';

      return { ...state, [slot]: item.id };
    }
    /* Used when the server turns out to hold more gems than this device does,
       which is what an admin grant looks like from here. */
    case 'SET_GEMS':
      return { ...state, gems: action.gems };
    // clearing the Supabase session is not enough on its own: the screen and the
    // previous learner's XP, streak and finished lessons live here, and would
    // otherwise stay on display until somebody else's progress overwrote them
    case 'SIGN_OUT':
      return { ...initialState };
    default:
      return state;
  }
}
