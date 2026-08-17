/** App state. Copied from the web build — the reducer is platform-agnostic. */

import { cosmeticById, GEMS_PER_LESSON, HEART_REFILL_PRICE, owns } from '../data/cosmetics';
import { lessons, onboardingSlides } from '../data/lessons';

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
  onboardingIndex: number;
  authMode: 'login' | 'register';
  goal: string;
  experience: string;
  language: string;
  xp: number;
  streak: number;
  hearts: number;
  gems: number;
  /** ids of bought cosmetics; the free ones are never listed here */
  ownedItems: string[];
  snakeSkin: string;
  snakeHat: string;
  snakeTrail: string;
  completedLessons: number[];
  lastResult: { xp: number; accuracy: number; title: string } | null;
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
        completedLessons: number[];
        profileStartedAt?: string;
        displayName?: string;
      };
    }
  | { type: 'SET_SYNC_MESSAGE'; message: string }
  | { type: 'SET_DISPLAY_NAME'; name: string }
  | { type: 'SET_AVATAR'; uri: string; url?: string }
  | { type: 'BUY_COSMETIC'; id: string }
  | { type: 'EQUIP_COSMETIC'; id: string }
  | { type: 'BUY_HEARTS' }
  | { type: 'SET_GEMS'; gems: number }
  | { type: 'SET_STREAK'; streak: number }
  | { type: 'SIGN_OUT' };

export const initialState: State = {
  screen: 'onboarding',
  displayName: '',
  avatarUri: '',
  avatarUrl: '',
  onboardingIndex: 0,
  authMode: 'register',
  goal: '',
  experience: '',
  language: 'Python',
  // a new learner starts empty; anything else is a number the app invented
  xp: 0,
  streak: 0,
  hearts: 5,
  gems: 0,
  ownedItems: [],
  snakeSkin: 'green',
  snakeHat: 'none',
  snakeTrail: 'plain',
  completedLessons: [],
  lastResult: null,
  lesson: null,
  profileStartedAt: new Date().toISOString().slice(0, 10),
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

      return {
        ...state,
        hearts: correct ? state.hearts : Math.max(0, state.hearts - 1),
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
      const earnedXp = 10 + state.lesson.correct * 5;

      return {
        ...state,
        screen: 'result',
        xp: state.xp + earnedXp,
        gems: state.gems + GEMS_PER_LESSON,
        completedLessons: state.completedLessons.includes(currentLesson.id)
          ? state.completedLessons
          : [...state.completedLessons, currentLesson.id],
        lastResult: { xp: earnedXp, accuracy, title: currentLesson.title },
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
    case 'SET_AVATAR':
      return {
        ...state,
        avatarUri: action.uri,
        // an upload that failed leaves the shared copy alone rather than
        // clearing it, so the League keeps the last picture that did land
        avatarUrl: action.url === undefined ? state.avatarUrl : action.url,
      };
    /* Buying and wearing are separate steps on purpose: the shop hands over the
       item, the wardrobe decides what is worn. Both refuse silently rather than
       throwing, since the screens already hide what cannot be afforded. */
    case 'BUY_COSMETIC': {
      const item = cosmeticById(action.id);

      if (!item || owns(item, state.ownedItems) || state.gems < item.price) {
        return state;
      }

      return {
        ...state,
        gems: state.gems - item.price,
        ownedItems: [...state.ownedItems, item.id],
      };
    }
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
    case 'BUY_HEARTS':
      if (state.gems < HEART_REFILL_PRICE || state.hearts >= 5) {
        return state;
      }

      return { ...state, gems: state.gems - HEART_REFILL_PRICE, hearts: 5 };
    case 'SET_STREAK':
      return { ...state, streak: action.streak };
    // clearing the Supabase session is not enough on its own: the screen and the
    // previous learner's XP, streak and finished lessons live here, and would
    // otherwise stay on display until somebody else's progress overwrote them
    case 'SIGN_OUT':
      return { ...initialState };
    default:
      return state;
  }
}
