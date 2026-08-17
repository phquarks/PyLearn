import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type * as React from 'react';

import logoMark from './assets/logo-mark.webp';
import { getCurrentSession, signInWithEmail, signOut, signUpWithEmail, subscribeToAuthChanges } from './api/auth';
import { PyLearnLogo } from './components/PyLearnLogo';
import { getLearningProgress, upsertLearningProgress } from './api/learningProgress';
import { getErrorMessage } from './utils/errorMessage';

type Screen =
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
  | 'customize'
  | 'shop';

type ChoiceQuestion = {
  type: 'choice';
  prompt: string;
  code?: string;
  options: string[];
  answer: string;
  explanation: string;
};

type BlankQuestion = {
  type: 'blank';
  prompt: string;
  code: string;
  options: string[];
  answer: string;
  explanation: string;
};

type BlocksQuestion = {
  type: 'blocks';
  prompt: string;
  options: string[];
  answer: string[];
  explanation: string;
};

type BugQuestion = {
  type: 'bug';
  prompt: string;
  code: string;
  options: string[];
  answer: string;
  explanation: string;
};

type Question = ChoiceQuestion | BlankQuestion | BlocksQuestion | BugQuestion;

type Lesson = {
  id: number;
  title: string;
  icon: string;
  color: string;
  questions: Question[];
};

type LessonSession = {
  lessonId: number;
  questionIndex: number;
  correct: number;
  answered: boolean;
  isCorrect: boolean | null;
  selected: string | string[];
  shake: boolean;
};

type State = {
  screen: Screen;
  onboardingIndex: number;
  authMode: 'login' | 'register';
  goal: string;
  experience: string;
  language: string;
  xp: number;
  streak: number;
  hearts: number;
  completedLessons: number[];
  lastResult: { xp: number; accuracy: number; title: string } | null;
  lesson: LessonSession | null;
  profileStartedAt: string;
  syncMessage: string;
};

type Action =
  | { type: 'NEXT_ONBOARDING' }
  | { type: 'GO_TO'; screen: Screen }
  | { type: 'SET_AUTH_MODE'; mode: 'login' | 'register' }
  | { type: 'SET_GOAL'; goal: string }
  | { type: 'SET_EXPERIENCE'; experience: string }
  | { type: 'SET_LANGUAGE'; language: string }
  | { type: 'START_LESSON'; lessonId: number }
  | { type: 'SELECT_ANSWER'; value: string }
  | { type: 'TOGGLE_BLOCK'; value: string }
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
        completedLessons: number[];
        profileStartedAt?: string;
      };
    }
  | { type: 'SET_SYNC_MESSAGE'; message: string };

const onboardingSlides = [
  {
    icon: '🐍',
    title: 'Python in 5 minutes a day',
    text: 'Short exercises, instant feedback, and a path from your first variable to confident code.',
  },
  {
    icon: '⚡',
    title: 'Learn by doing',
    text: 'Pick answers, assemble lines of code, and fix bugs right inside the lessons.',
  },
  {
    icon: '🔥',
    title: 'Keep your streak',
    text: 'Earn XP, guard your hearts, and unlock new topics every day.',
  },
  {
    icon: '🏆',
    title: 'Ready for your first lesson?',
    text: 'We start with the basics and make Python syntax click without dry theory.',
  },
];

const lessons: Lesson[] = [
  {
    id: 1,
    title: 'Variables',
    icon: '📦',
    color: '#58CC02',
    questions: [
      {
        type: 'choice',
        prompt: 'Which line creates a variable name holding "Ada"?',
        options: ['name = "Ada"', 'let name = "Ada"', 'var name: Ada', 'name <- "Ada"'],
        answer: 'name = "Ada"',
        explanation: 'In Python you create a variable with a name, an = sign, and a value.',
      },
      {
        type: 'blank',
        prompt: 'Fill in the blank so that age holds a number.',
        code: 'age = ___',
        options: ['16', '"16"', 'sixteen', 'true'],
        answer: '16',
        explanation: 'Numbers are written without quotes, strings go inside quotes.',
      },
      {
        type: 'blocks',
        prompt: 'Assemble the code that stores a city in a variable.',
        options: ['city', '=', '"Almaty"'],
        answer: ['city', '=', '"Almaty"'],
        explanation: 'The name goes on the left, then =, then the value on the right.',
      },
      {
        type: 'bug',
        prompt: 'Where is the bug in this code?',
        code: 'score == 10',
        options: ['It needs a single =', 'It needs quotes', 'It needs a semicolon', 'There is no bug'],
        answer: 'It needs a single =',
        explanation: '== compares two values. Assignment needs a single = sign.',
      },
    ],
  },
  {
    id: 2,
    title: 'print()',
    icon: '🖨️',
    color: '#1CB0F6',
    questions: [
      {
        type: 'choice',
        prompt: 'Which line prints text to the screen?',
        options: ['print("Hello")', 'show("Hello")', 'echo "Hello"', 'console.log("Hello")'],
        answer: 'print("Hello")',
        explanation: 'The print() function writes a value to the Python console.',
      },
      {
        type: 'blank',
        prompt: 'Print the value of the variable total.',
        code: '___(total)',
        options: ['print', 'input', 'str', 'len'],
        answer: 'print',
        explanation: 'print(total) shows the current value of total.',
      },
      {
        type: 'blocks',
        prompt: 'Assemble a statement that prints "Python!".',
        options: ['print', '(', '"Python!"', ')'],
        answer: ['print', '(', '"Python!"', ')'],
        explanation: 'The argument of print goes inside the parentheses.',
      },
      {
        type: 'bug',
        prompt: 'What breaks this code?',
        code: 'print(Hello)',
        options: ['Hello has no quotes', 'Extra parentheses', 'It needs an = sign', 'Nothing'],
        answer: 'Hello has no quotes',
        explanation: 'A text string must be quoted: print("Hello").',
      },
    ],
  },
  {
    id: 3,
    title: 'if / else',
    icon: '🔀',
    color: '#FFC800',
    questions: [
      {
        type: 'choice',
        prompt: 'Which keyword checks a condition?',
        options: ['if', 'when', 'check', 'case'],
        answer: 'if',
        explanation: 'if runs a block of code when the condition is true.',
      },
      {
        type: 'blank',
        prompt: 'Fill in the blank.',
        code: 'if points > 10:\n    print("win")\n___:\n    print("try again")',
        options: ['else', 'other', 'elif', 'again'],
        answer: 'else',
        explanation: 'else runs when the if condition was not met.',
      },
      {
        type: 'blocks',
        prompt: 'Assemble a simple condition.',
        options: ['if', 'age >= 18', ':'],
        answer: ['if', 'age >= 18', ':'],
        explanation: 'In Python a condition line always ends with a colon.',
      },
      {
        type: 'bug',
        prompt: 'What is wrong here?',
        code: 'if temperature > 30\n    print("hot")',
        options: ['The colon is missing', 'It needs a ;', '> is not allowed', 'print is spelled wrong'],
        answer: 'The colon is missing',
        explanation: 'An if condition must always be followed by a colon.',
      },
    ],
  },
  {
    id: 4,
    title: 'Loops',
    icon: '🔁',
    color: '#CE82FF',
    questions: [
      {
        type: 'choice',
        prompt: 'How do you visit every number in the list nums?',
        options: ['for n in nums:', 'each n of nums:', 'loop nums as n:', 'while n in nums:'],
        answer: 'for n in nums:',
        explanation: 'for walks through the items of a sequence one by one.',
      },
      {
        type: 'blank',
        prompt: 'Repeat the action 3 times.',
        code: 'for i in ___(3):\n    print(i)',
        options: ['range', 'repeat', 'loop', 'times'],
        answer: 'range',
        explanation: 'range(3) produces the sequence 0, 1, 2.',
      },
      {
        type: 'blocks',
        prompt: 'Assemble a while loop.',
        options: ['while', 'lives > 0', ':'],
        answer: ['while', 'lives > 0', ':'],
        explanation: 'while keeps running for as long as the condition is true.',
      },
      {
        type: 'bug',
        prompt: 'What is wrong with this code?',
        code: 'for item in cart\n    print(item)',
        options: ['The colon is missing', 'It needs an else', 'item must be a number', 'cart needs quotes'],
        answer: 'The colon is missing',
        explanation: 'for and while lines in Python end with a colon.',
      },
    ],
  },
  {
    id: 5,
    title: 'Lists',
    icon: '📋',
    color: '#FF9600',
    questions: [
      {
        type: 'choice',
        prompt: 'How do you create a list of fruits?',
        options: ['fruits = ["apple", "pear"]', 'fruits = ("apple", "pear")', 'fruits = {"apple"}', 'fruits = <apple, pear>'],
        answer: 'fruits = ["apple", "pear"]',
        explanation: 'Python lists are written with square brackets.',
      },
      {
        type: 'blank',
        prompt: 'Take the first item of the list.',
        code: 'first = names[___]',
        options: ['0', '1', 'first', '-'],
        answer: '0',
        explanation: 'List indexing starts at zero.',
      },
      {
        type: 'blocks',
        prompt: 'Add "tea" to the drinks list.',
        options: ['drinks', '.', 'append', '(', '"tea"', ')'],
        answer: ['drinks', '.', 'append', '(', '"tea"', ')'],
        explanation: 'The append method adds a new item to the end of a list.',
      },
      {
        type: 'bug',
        prompt: 'Why does this code miss the first item?',
        code: 'letters = ["a", "b"]\nprint(letters[1])',
        options: ['Index 1 is the second item', 'It needs parentheses', 'The list is empty', 'print cannot take a list'],
        answer: 'Index 1 is the second item',
        explanation: 'letters[0] is the first item, letters[1] is the second.',
      },
    ],
  },
];

const initialState: State = {
  screen: 'onboarding',
  onboardingIndex: 0,
  authMode: 'register',
  goal: '',
  experience: '',
  language: 'Python',
  xp: 120,
  streak: 3,
  hearts: 5,
  completedLessons: [],
  lastResult: null,
  lesson: null,
  profileStartedAt: '2026-07-13',
  syncMessage: '',
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'NEXT_ONBOARDING': {
      if (state.onboardingIndex >= onboardingSlides.length - 1) {
        return { ...state, screen: 'auth' };
      }

      return { ...state, onboardingIndex: state.onboardingIndex + 1 };
    }
    case 'GO_TO':
      return { ...state, screen: action.screen };
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
            ? state.lesson.selected.includes(action.value)
              ? state.lesson.selected.filter((block) => block !== action.value)
              : [...state.lesson.selected, action.value]
            : [action.value],
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
            selected.every((block, index) => block === question.answer[index])
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
        streak: state.streak + 1,
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
        syncMessage: '',
      };
    case 'SET_SYNC_MESSAGE':
      return { ...state, syncMessage: action.message };
    default:
      return state;
  }
}

function AppButton({
  children,
  onClick,
  disabled = false,
  variant = 'green',
  full = true,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'green' | 'blue' | 'white' | 'orange' | 'red';
  full?: boolean;
}) {
  return (
    <button className={`app-button app-button-${variant} ${full ? 'app-button-full' : ''}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

function PhoneShell({
  children,
  withNav = false,
  vg = false,
}: {
  children: React.ReactNode;
  withNav?: boolean;
  vg?: boolean;
}) {
  return (
    <main className="python-app">
      <section className={`phone-shell ${withNav ? 'phone-shell-nav' : ''} ${vg ? 'phone-shell-vg' : ''}`}>
        {children}
      </section>
    </main>
  );
}

/** Material Symbols Rounded. The design system draws every icon; no emoji stand-ins. */
function Icon({ name, outline = false, size }: { name: string; outline?: boolean; size?: number }) {
  return (
    <span aria-hidden="true" className={`vg-icon ${outline ? 'vg-icon-outline' : ''}`} style={size ? { fontSize: size } : undefined}>
      {name}
    </span>
  );
}

function VgTopBar({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  return (
    <header className="vg-topbar">
      <button className="vg-stat vg-stat-streak" title={`${state.streak}-day streak`} type="button">
        <Icon name="local_fire_department" />
        {state.streak}
      </button>
      <button
        className="vg-stat vg-stat-gems"
        onClick={() => dispatch({ type: 'GO_TO', screen: 'shop' })}
        title="Open the shop"
        type="button"
      >
        <Icon name="diamond" />
        {state.xp}
      </button>
      <button className="vg-stat vg-stat-hearts" title={`${state.hearts} hearts left`} type="button">
        <Icon name="favorite" />
        {state.hearts}
      </button>
    </header>
  );
}

const navTabs: { screen: Screen; icon: string; label: string }[] = [
  { screen: 'home', icon: 'home', label: 'Home' },
  // leaderboard and bar_chart both read as bars at 24px; keep the two tabs apart
  { screen: 'progress', icon: 'trending_up', label: 'Progress' },
  { screen: 'league', icon: 'leaderboard', label: 'League' },
  { screen: 'profile', icon: 'person', label: 'Profile' },
];

/**
 * The droplet behind the tabs is spring-driven rather than transitioned, so it
 * can be dragged: press anywhere on the bar and it follows the finger, squashing
 * along the direction of travel and settling with a small overshoot when let go.
 *
 * The spring runs on refs inside one rAF loop — putting the position in state
 * would re-render the whole shell on every frame.
 */
function VgNav({ current, dispatch }: { current: Screen; dispatch: React.Dispatch<Action> }) {
  const navRef = useRef<HTMLElement | null>(null);
  const dropRef = useRef<HTMLSpanElement | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const activeIndex = Math.max(
    0,
    navTabs.findIndex((tab) => tab.screen === current),
  );
  const spring = useRef({ x: 0, v: 0, target: 0, raf: 0, dragging: false, ready: false });

  const slotAt = useCallback((index: number) => {
    const nav = navRef.current;
    const button = nav?.children.item(index + 1);

    return button instanceof HTMLElement ? { left: button.offsetLeft, width: button.offsetWidth, height: button.offsetHeight } : null;
  }, []);

  const paint = useCallback(() => {
    const drop = dropRef.current;
    const state = spring.current;

    if (!drop) {
      return;
    }

    // squash along travel, thin across it: the classic droplet read
    const stretch = Math.min(0.4, Math.abs(state.v) * 0.028);
    drop.style.transform = `translateX(${state.x}px) scaleX(${1 + stretch}) scaleY(${1 - stretch * 0.5})`;
  }, []);

  const run = useCallback(() => {
    const state = spring.current;

    if (state.raf) {
      return;
    }

    const step = () => {
      const distance = state.target - state.x;

      // stiffer while the finger is down so it tracks, springier once released
      state.v += distance * (state.dragging ? 0.34 : 0.19);
      state.v *= state.dragging ? 0.55 : 0.74;
      state.x += state.v;
      paint();

      if (state.dragging || Math.abs(distance) > 0.4 || Math.abs(state.v) > 0.4) {
        state.raf = requestAnimationFrame(step);
      } else {
        state.x = state.target;
        state.v = 0;
        paint();
        state.raf = 0;
      }
    };

    state.raf = requestAnimationFrame(step);
  }, [paint]);

  // place the droplet on the live tab, and keep it there across resizes
  useEffect(() => {
    const settle = (jump: boolean) => {
      const slot = slotAt(activeIndex);
      const drop = dropRef.current;

      if (!slot || !drop || spring.current.dragging) {
        return;
      }

      drop.style.width = `${slot.width}px`;
      drop.style.height = `${slot.height}px`;
      spring.current.target = slot.left;

      if (jump || !spring.current.ready) {
        spring.current.x = slot.left;
        spring.current.v = 0;
        spring.current.ready = true;
        paint();
        return;
      }

      run();
    };

    settle(!spring.current.ready);

    const onResize = () => settle(true);
    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, [activeIndex, slotAt, paint, run]);

  useEffect(() => () => cancelAnimationFrame(spring.current.raf), []);

  const indexFromPointer = (clientX: number) => {
    const nav = navRef.current;

    if (!nav) {
      return activeIndex;
    }

    const x = clientX - nav.getBoundingClientRect().left;
    let nearest = 0;
    let best = Infinity;

    navTabs.forEach((_, index) => {
      const slot = slotAt(index);

      if (!slot) {
        return;
      }

      const gap = Math.abs(slot.left + slot.width / 2 - x);

      if (gap < best) {
        best = gap;
        nearest = index;
      }
    });

    return nearest;
  };

  const dragTo = (clientX: number) => {
    const nav = navRef.current;
    const slot = slotAt(0);

    if (!nav || !slot) {
      return;
    }

    const x = clientX - nav.getBoundingClientRect().left;
    const max = nav.clientWidth - slot.width - slot.left;
    spring.current.target = Math.min(Math.max(x - slot.width / 2, slot.left), max);
    setDragIndex(indexFromPointer(clientX));
    run();
  };

  const handleDown = (event: React.PointerEvent<HTMLElement>) => {
    // let the keyboard and assistive paths keep using plain activation
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // a pointer that is already gone cannot be captured; the drag still works
    }

    spring.current.dragging = true;
    dragTo(event.clientX);
  };

  const handleMove = (event: React.PointerEvent<HTMLElement>) => {
    if (spring.current.dragging) {
      dragTo(event.clientX);
    }
  };

  const handleUp = (event: React.PointerEvent<HTMLElement>) => {
    if (!spring.current.dragging) {
      return;
    }

    spring.current.dragging = false;

    const index = indexFromPointer(event.clientX);
    const slot = slotAt(index);

    if (slot) {
      spring.current.target = slot.left;
      run();
    }

    setDragIndex(null);

    const tab = navTabs[index];

    if (tab) {
      dispatch({ type: 'GO_TO', screen: tab.screen });
    }
  };

  return (
    <nav
      aria-label="Main navigation"
      className={`vg-nav ${dragIndex !== null ? 'dragging' : ''}`}
      onPointerCancel={handleUp}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      ref={navRef}
    >
      <span aria-hidden="true" className="vg-nav-drop" ref={dropRef} />
      {navTabs.map((tab, index) => {
        const lit = dragIndex === null ? current === tab.screen : dragIndex === index;

        return (
          <button
            aria-current={current === tab.screen ? 'page' : undefined}
            className={lit ? 'active' : ''}
            key={tab.screen}
            onClick={() => dispatch({ type: 'GO_TO', screen: tab.screen })}
            type="button"
          >
            <Icon name={tab.icon} outline={!lit} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

function OnboardingScreen({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  const slide = onboardingSlides[state.onboardingIndex] ?? onboardingSlides[0]!;

  return (
    <PhoneShell>
      <div className="screen fade-screen onboarding">
        <div className="brand-row">
          <PyLearnLogo />
        </div>
        <div className="hero-bubble" aria-hidden="true">
          <span>{slide.icon}</span>
        </div>
        <div className="copy-stack">
          <h1>{slide.title}</h1>
          <p>{slide.text}</p>
        </div>
        <div className="dots">
          {onboardingSlides.map((item) => (
            <span className={item.title === slide.title ? 'active' : ''} key={item.title} />
          ))}
        </div>
        <div className="action-stack">
          <AppButton onClick={() => dispatch({ type: 'NEXT_ONBOARDING' })}>
            {state.onboardingIndex === onboardingSlides.length - 1 ? 'Get started' : 'Next'}
          </AppButton>
          <button className="ghost-link" onClick={() => dispatch({ type: 'GO_TO', screen: 'auth' })}>
            I already have an account
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}

function AuthScreen({
  state,
  dispatch,
  onAuthenticated,
}: {
  state: State;
  dispatch: React.Dispatch<Action>;
  onAuthenticated: (session: Session) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = email.trim().length > 3 && password.length >= 6 && !isSubmitting;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setStatus('');
    setIsSubmitting(true);

    try {
      const credentials = { email: email.trim(), password };
      const session =
        state.authMode === 'login'
          ? await signInWithEmail(credentials)
          : await signUpWithEmail({
              ...credentials,
              redirectTo: window.location.origin,
            });

      if (session) {
        onAuthenticated(session);
        dispatch({ type: 'GO_TO', screen: 'goal' });
      } else {
        setStatus('Check your inbox to confirm the sign-up, then log in.');
      }
    } catch (authError) {
      setError(getErrorMessage(authError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PhoneShell>
      <form className="screen fade-screen auth-screen" onSubmit={(event) => void handleSubmit(event)}>
        <div className="brand-row center">
          <PyLearnLogo />
        </div>
        <h1>{state.authMode === 'login' ? 'Welcome back!' : 'Create your profile'}</h1>
        <div className="mode-tabs">
          <button className={state.authMode === 'login' ? 'active' : ''} onClick={() => dispatch({ type: 'SET_AUTH_MODE', mode: 'login' })}>
            Log in
          </button>
          <button
            className={state.authMode === 'register' ? 'active' : ''}
            onClick={() => dispatch({ type: 'SET_AUTH_MODE', mode: 'register' })}
          >
            Sign up
          </button>
        </div>
        <div className="form-stack">
          <input aria-label="Email" onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" value={email} />
          <input
            aria-label="Password"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            value={password}
          />
        </div>
        {error ? <p className="auth-alert error">{error}</p> : null}
        {status ? <p className="auth-alert success">{status}</p> : null}
        <AppButton disabled={!canSubmit}>{isSubmitting ? 'Connecting...' : 'Continue'}</AppButton>
        <div className="social-grid">
          <button type="button">G Google</button>
          <button type="button"> Apple</button>
        </div>
      </form>
    </PhoneShell>
  );
}

function ChoiceCards({
  title,
  subtitle,
  options,
  onSelect,
}: {
  title: string;
  subtitle: string;
  options: { icon: string; title: string; text: string }[];
  onSelect: (value: string) => void;
}) {
  return (
    <PhoneShell>
      <div className="screen fade-screen">
        <div className="mini-header">
          <span>🐍</span>
          <div>
            <strong>{title}</strong>
            <p>{subtitle}</p>
          </div>
        </div>
        <div className="option-list">
          {options.map((option) => (
            <button className="option-card" key={option.title} onClick={() => onSelect(option.title)}>
              <span>{option.icon}</span>
              <div>
                <strong>{option.title}</strong>
                <small>{option.text}</small>
              </div>
            </button>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

function LanguageScreen({ dispatch }: { dispatch: React.Dispatch<Action> }) {
  const languages: [string, string, string][] = [
    ['🐍', 'Python', 'Active'],
    ['🟨', 'JavaScript', 'Soon'],
    ['☕', 'Java', 'Soon'],
    ['⚙️', 'C++', 'Soon'],
    ['🦀', 'Rust', 'Soon'],
    ['💎', 'Ruby', 'Soon'],
  ];

  return (
    <PhoneShell>
      <div className="screen fade-screen">
        <div className="mini-header">
          <span>💻</span>
          <div>
            <strong>Choose a language</strong>
            <p>Only the first course is available for now.</p>
          </div>
        </div>
        <div className="language-grid">
          {languages.map(([icon, name, badge]) => (
            <button
              className={`language-card ${name !== 'Python' ? 'locked' : ''}`}
              disabled={name !== 'Python'}
              key={name}
              onClick={() => dispatch({ type: 'SET_LANGUAGE', language: name })}
            >
              <span className="language-icon">{icon}</span>
              <strong>{name}</strong>
              <small>{badge}</small>
            </button>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

/** icon for each lesson, drawn from the icon set rather than the emoji the data carries */
const lessonIcons: Record<number, string> = {
  1: 'inventory_2',
  2: 'terminal',
  3: 'alt_route',
  4: 'refresh',
  5: 'format_list_bulleted',
};

/* The winding track.

   Stone centres and the curve are generated from one table, inside a fixed
   320-wide coordinate space pinned to the container's centre line. Sharing the
   geometry is what keeps the ribbon threaded through the stones at any width;
   two separate sets of numbers drift apart the moment the container resizes. */
const PATH_W = 320;
const PATH_CX = PATH_W / 2;
const PATH_TOP = 48;
const PATH_STEP = 128;
const PATH_SWING = [0, 58, 0, -58];

function pathX(index: number) {
  return PATH_CX + (PATH_SWING[index % PATH_SWING.length] ?? 0);
}

function pathY(index: number) {
  return PATH_TOP + index * PATH_STEP;
}

/** smooth vertical S-curves: each control point sits halfway down its segment */
function buildTrack(count: number) {
  let d = `M ${pathX(0)} ${pathY(0)}`;

  for (let i = 1; i < count; i += 1) {
    const midY = (pathY(i - 1) + pathY(i)) / 2;
    d += ` C ${pathX(i - 1)} ${midY} ${pathX(i)} ${midY} ${pathX(i)} ${pathY(i)}`;
  }

  return d;
}

function HomeScreen({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  const doneCount = state.completedLessons.length;
  // the first lesson that is unlocked but not finished is where the learner is standing
  const activeIndex = lessons.findIndex((lesson) => !state.completedLessons.includes(lesson.id));
  const stopCount = lessons.length + 1; // the reward closes the route
  const trackHeight = pathY(stopCount - 1) + 90;

  return (
    <PhoneShell vg>
      <VgTopBar state={state} dispatch={dispatch} />
      <div className="vg-screen fade-screen">
        <section className="vg-unit">
          <h2>Unit 1 · Python Basics</h2>
          <p>{doneCount} of {lessons.length} stones cleared. Next up: your first program.</p>
          <img alt="" className="vg-unit-mark" src={logoMark} />
        </section>

        <div className="vg-path" style={{ height: trackHeight }}>
          <svg className="vg-path-track" height={trackHeight} width={PATH_W} aria-hidden="true">
            <path
              d={buildTrack(stopCount)}
              fill="none"
              stroke="var(--vg-surface-highest)"
              strokeLinecap="round"
              strokeWidth="12"
            />
          </svg>

          {lessons.map((lesson, index) => {
            const previousLesson = lessons[index - 1];
            const unlocked = index === 0 || (previousLesson ? state.completedLessons.includes(previousLesson.id) : false);
            const complete = state.completedLessons.includes(lesson.id);
            const isActive = index === activeIndex && unlocked;
            const questionsDone = isActive ? (state.lesson?.lessonId === lesson.id ? state.lesson.questionIndex : 0) : 0;
            const ringLength = 226;

            return (
              <div
                className="vg-node-wrap"
                key={lesson.id}
                style={{ top: pathY(index) - 38, marginLeft: pathX(index) - PATH_CX - 38 }}
              >
                {isActive ? (
                  <>
                    <svg className="vg-node-ring" height="94" viewBox="0 0 94 94" width="94">
                      <circle cx="47" cy="47" fill="none" r="36" stroke="#e3e2e2" strokeWidth="7" />
                      <circle
                        cx="47"
                        cy="47"
                        fill="none"
                        r="36"
                        stroke="#58cc02"
                        strokeDasharray={ringLength}
                        strokeDashoffset={ringLength - (ringLength * questionsDone) / lesson.questions.length}
                        strokeLinecap="round"
                        strokeWidth="7"
                      />
                    </svg>
                    <span className={`vg-cheer ${pathX(index) > PATH_CX ? 'vg-cheer-left' : 'vg-cheer-right'}`}>
                      <img alt="" src={logoMark} />
                      You&rsquo;re doing great! Keep it up!
                    </span>
                  </>
                ) : null}
                <button
                  aria-label={`${lesson.title}${complete ? ', completed' : unlocked ? '' : ', locked'}`}
                  className={`vg-node ${complete ? 'vg-node-done' : isActive ? 'vg-node-active' : ''}`}
                  disabled={!unlocked}
                  onClick={() => dispatch({ type: 'START_LESSON', lessonId: lesson.id })}
                  type="button"
                >
                  <Icon name={complete ? 'star' : unlocked ? lessonIcons[lesson.id] ?? 'play_arrow' : 'lock'} />
                  <span className="vg-node-label">{unlocked ? lesson.title : 'Locked'}</span>
                </button>
              </div>
            );
          })}

          <div
            className="vg-node-wrap"
            style={{ top: pathY(stopCount - 1) - 44, marginLeft: pathX(stopCount - 1) - PATH_CX - 44 }}
          >
            <button
              aria-label="Course reward, locked until every lesson is cleared"
              className="vg-node vg-node-goal"
              disabled={doneCount < lessons.length}
              type="button"
            >
              <Icon name={doneCount < lessons.length ? 'lock' : 'redeem'} size={40} />
            </button>
          </div>
        </div>
      </div>
      <VgNav current="home" dispatch={dispatch} />
    </PhoneShell>
  );
}

function LessonScreen({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  const session = state.lesson;
  const lesson = lessons.find((item) => item.id === session?.lessonId);
  const question = lesson?.questions[session?.questionIndex ?? 0];
  const selected = session?.selected ?? [];
  const canCheck = Array.isArray(selected) ? selected.length > 0 : selected.length > 0;

  if (!session || !lesson || !question) {
    return (
      <PhoneShell vg>
        <div className="vg-screen" style={{ display: 'grid', placeItems: 'center' }}>
          <button className="vg-btn" onClick={() => dispatch({ type: 'GO_TO', screen: 'home' })} type="button">
            Back to the path
          </button>
        </div>
      </PhoneShell>
    );
  }

  const progress = ((session.questionIndex + Number(session.answered)) / lesson.questions.length) * 100;

  return (
    <PhoneShell vg>
      <div className="vg-lesson-top">
        <button aria-label="Quit lesson" className="vg-iconbtn" onClick={() => dispatch({ type: 'GO_TO', screen: 'home' })} type="button">
          <Icon name="close" />
        </button>
        <div className="vg-track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <span className="vg-hearts" title={`${state.hearts} hearts left`}>
          <Icon name="favorite" />
          {state.hearts}
        </span>
      </div>

      <div
        className={`vg-screen fade-screen ${session.shake ? 'shake' : ''}`}
        onAnimationEnd={() => dispatch({ type: 'STOP_SHAKE' })}
      >
        <h1 className="vg-prompt">{question.prompt}</h1>

        {'code' in question ? (
          <div className="vg-coach">
            <span className="vg-mascot">
              <img alt="" src={logoMark} />
            </span>
            <pre className="vg-bubble vg-code">{question.code}</pre>
          </div>
        ) : null}

        <QuestionInput question={question} selected={selected} dispatch={dispatch} answered={session.answered} />
      </div>

      {session.answered ? (
        <div className={`vg-feedback ${session.isCorrect ? 'vg-feedback-good' : 'vg-feedback-bad'}`}>
          {session.isCorrect ? <Confetti /> : null}
          <div className="vg-feedback-head">
            <Icon name={session.isCorrect ? 'check_circle' : 'cancel'} />
            {session.isCorrect ? 'Nice work!' : 'Almost!'}
          </div>
          <p>{question.explanation}</p>
          <button
            className={`vg-btn ${session.isCorrect ? '' : 'vg-btn-danger'}`}
            onClick={() => dispatch({ type: 'CONTINUE_LESSON' })}
            type="button"
          >
            Continue
          </button>
        </div>
      ) : (
        <div className="vg-actionbar">
          <button className="vg-btn" disabled={!canCheck} onClick={() => dispatch({ type: 'CHECK_ANSWER' })} type="button">
            Check
          </button>
        </div>
      )}
    </PhoneShell>
  );
}

function QuestionInput({
  question,
  selected,
  answered,
  dispatch,
}: {
  question: Question;
  selected: string | string[];
  answered: boolean;
  dispatch: React.Dispatch<Action>;
}) {
  if (question.type === 'blocks') {
    const selectedBlocks = Array.isArray(selected) ? selected : [];

    return (
      <div>
        <div className="vg-dropzone">
          {selectedBlocks.length ? (
            selectedBlocks.map((block) => (
              <button
                className="vg-chip"
                disabled={answered}
                key={block}
                onClick={() => dispatch({ type: 'TOGGLE_BLOCK', value: block })}
                type="button"
              >
                {block}
              </button>
            ))
          ) : (
            <span className="vg-dropzone-empty">Tap the blocks below to build the line</span>
          )}
        </div>
        <div className="vg-chips">
          {question.options.map((option) => {
            const used = selectedBlocks.includes(option);

            return (
              // the chip keeps its slot when used, so the bank does not reflow under the finger
              <button
                aria-hidden={used}
                className={`vg-chip ${used ? 'used' : ''}`}
                disabled={answered || used}
                key={option}
                onClick={() => dispatch({ type: 'TOGGLE_BLOCK', value: option })}
                type="button"
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="vg-tiles">
      {question.options.map((option) => {
        const isSelected = selected === option;
        const verdict = answered && isSelected ? (option === question.answer ? 'correct' : 'wrong') : '';
        const missed = answered && !isSelected && option === question.answer ? 'correct' : '';

        return (
          <button
            className={`vg-tile ${isSelected && !answered ? 'selected' : ''} ${verdict} ${missed}`}
            disabled={answered}
            key={option}
            onClick={() => dispatch({ type: 'SELECT_ANSWER', value: option })}
            type="button"
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {['#58CC02', '#FFC800', '#1CB0F6', '#FF4B4B', '#CE82FF', '#FF9600'].map((color, index) => (
        <i key={color} style={{ '--piece-color': color, '--piece-index': index } as React.CSSProperties} />
      ))}
    </div>
  );
}

function ResultScreen({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  const result = state.lastResult;

  return (
    <PhoneShell vg>
      <div className="vg-screen fade-screen">
        <Confetti />
        <div className="vg-result">
          <span className="vg-avatar" style={{ width: 128, height: 128 }}>
            <img alt="" src={logoMark} />
          </span>
          <h1 className="vg-h1">Lesson complete!</h1>
          <p className="vg-sub" style={{ marginBottom: 4 }}>
            {result?.title ?? 'Python Basics'} just got closer.
          </p>
          <div className="vg-result-grid">
            <div className="vg-stat-card">
              <Icon name="diamond" size={26} />
              <strong>+{result?.xp ?? 0}</strong>
              <span>XP earned</span>
            </div>
            <div className="vg-stat-card">
              <Icon name="target" size={26} />
              <strong>{result?.accuracy ?? 0}%</strong>
              <span>accuracy</span>
            </div>
          </div>
          <button className="vg-btn" onClick={() => dispatch({ type: 'GO_TO', screen: 'home' })} type="button">
            Back to the path
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}

function ProgressScreen({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  const bars = [35, 55, 25, 70, 45, 80, Math.min(100, state.completedLessons.length * 20 + 20)];

  return (
    <PhoneShell vg>
      <VgTopBar state={state} dispatch={dispatch} />
      <div className="vg-screen fade-screen">
        <h1 className="vg-h1">Progress</h1>
        <p className="vg-sub">
          {state.completedLessons.length} of {lessons.length} lessons completed
        </p>

        <p className="vg-note">
          <Icon name="info" outline />
          The weekly chart is sample shape, not your real activity — daily history is not stored yet.
        </p>

        <div className="vg-chart">
          {bars.map((height, index) => (
            <div className="vg-bar" key={index}>
              <i style={{ height: `${height}%` }} />
              <small>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}</small>
            </div>
          ))}
        </div>

        <h2 className="vg-section-h">Topics</h2>
        <div className="vg-rows">
          {lessons.map((lesson) => {
            const done = state.completedLessons.includes(lesson.id);

            return (
              <div className="vg-row" key={lesson.id}>
                <Icon name={lessonIcons[lesson.id] ?? 'circle'} />
                <span className="vg-row-name">{lesson.title}</span>
                <span className="vg-row-value">{done ? 'Done' : 'Ahead'}</span>
              </div>
            );
          })}
        </div>
      </div>
      <VgNav current="progress" dispatch={dispatch} />
    </PhoneShell>
  );
}

function LeagueScreen({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  const users: [string, number][] = [
    ['Mira', state.xp + 80],
    ['Ayan', state.xp + 35],
    ['You', state.xp],
    ['Dana', Math.max(40, state.xp - 25)],
    ['Tim', Math.max(25, state.xp - 70)],
  ];

  return (
    <PhoneShell vg>
      <VgTopBar state={state} dispatch={dispatch} />
      <div className="vg-screen fade-screen">
        <div className="vg-result" style={{ paddingTop: 0, marginBottom: 20 }}>
          <span className="vg-dot" style={{ width: 72, height: 72, background: 'var(--vg-secondary-container)', color: 'var(--vg-on-secondary-fixed)' }}>
            <Icon name="trophy" size={36} />
          </span>
          <h1 className="vg-h1" style={{ marginTop: 8 }}>Gold League</h1>
          <p className="vg-sub" style={{ marginBottom: 0 }}>Top three keep their place this week.</p>
        </div>

        <p className="vg-note">
          <Icon name="info" outline />
          These rivals are sample names. Real standings need other players, which the app does not have yet.
        </p>

        <div className="vg-rows">
          {users.map(([name, xp], index) => (
            <div className={`vg-row ${name === 'You' ? 'vg-row-me' : ''}`} key={name}>
              <span className={`vg-rank ${index < 3 ? `vg-rank-${index + 1}` : ''}`}>{index + 1}</span>
              <span className="vg-row-name">{name}</span>
              <span className="vg-row-value">{xp} XP</span>
            </div>
          ))}
        </div>
      </div>
      <VgNav current="league" dispatch={dispatch} />
    </PhoneShell>
  );
}

function ProfileScreen({
  state,
  dispatch,
  userEmail,
  onSignOut,
}: {
  state: State;
  dispatch: React.Dispatch<Action>;
  userEmail: string;
  onSignOut: () => void;
}) {
  const badges: [string, string, boolean][] = [
    ['local_fire_department', `${state.streak}-day streak`, state.streak > 0],
    ['inventory_2', 'Variables', state.completedLessons.includes(1)],
    ['terminal', 'Output', state.completedLessons.includes(2)],
    ['refresh', 'Loops', state.completedLessons.includes(4)],
    ['workspace_premium', 'Python Master', state.completedLessons.length === lessons.length],
    ['bolt', 'Flawless run', false],
  ];

  return (
    <PhoneShell vg>
      <VgTopBar state={state} dispatch={dispatch} />
      <div className="vg-screen fade-screen">
        <section className="vg-profile">
          <span className="vg-avatar">
            <img alt="" src={logoMark} />
          </span>
          <h1>{userEmail || 'Python Learner'}</h1>
          <p className="vg-profile-meta">
            Learning since {new Date(state.profileStartedAt).toLocaleDateString('en-US')}
          </p>
          <p className="vg-profile-meta">{state.syncMessage || 'Synced with Supabase'}</p>
        </section>

        <div className="vg-stats">
          <div className="vg-stat-card">
            <strong>{state.streak}</strong>
            <span>streak</span>
          </div>
          <div className="vg-stat-card">
            <strong>{state.xp}</strong>
            <span>XP</span>
          </div>
          <div className="vg-stat-card">
            <strong>{state.completedLessons.length}</strong>
            <span>lessons</span>
          </div>
        </div>

        <h2 className="vg-section-h">Your snake</h2>
        <div className="vg-rows" style={{ marginBottom: 22 }}>
          <button className="vg-row" onClick={() => dispatch({ type: 'GO_TO', screen: 'customize' })} type="button">
            <Icon name="pets" />
            <span className="vg-row-name">Customize</span>
            <Icon name="chevron_right" outline />
          </button>
          <button className="vg-row" onClick={() => dispatch({ type: 'GO_TO', screen: 'shop' })} type="button">
            <Icon name="storefront" />
            <span className="vg-row-name">Shop</span>
            <Icon name="chevron_right" outline />
          </button>
        </div>

        <h2 className="vg-section-h">Achievements</h2>
        <div className="vg-badges">
          {badges.map(([icon, title, earned]) => (
            <span className={`vg-badge-tile ${earned ? '' : 'locked'}`} key={title}>
              <Icon name={earned ? icon : 'lock'} />
              {title}
            </span>
          ))}
        </div>

        <button className="vg-btn vg-btn-ghost" onClick={onSignOut} type="button">
          Log out
        </button>
      </div>
      <VgNav current="profile" dispatch={dispatch} />
    </PhoneShell>
  );
}

/* --------------------------------------------------------------------------
   Snake customization and shop.

   Both screens are presentation only, as agreed: the catalogue is static, a
   choice lives in component state and is gone on reload, and nothing is
   purchased or written to the database. Each screen says so rather than
   pretending to be wired up.
   -------------------------------------------------------------------------- */

type Cosmetic = {
  id: string;
  name: string;
  /** tints the preview so a choice is actually visible, not just highlighted */
  filter: string;
  swatch: string;
  icon?: string;
  owned: boolean;
};

const cosmetics: Record<string, Cosmetic[]> = {
  Skins: [
    { id: 'green', name: 'Default Green', filter: 'none', swatch: '#58cc02', owned: true },
    { id: 'gold', name: 'Golden Glider', filter: 'hue-rotate(-52deg) saturate(1.5)', swatch: '#fec700', owned: true },
    { id: 'blue', name: 'Blue Stripes', filter: 'hue-rotate(150deg) saturate(1.2)', swatch: '#4abdff', owned: true },
    { id: 'ruby', name: 'Ruby Red', filter: 'hue-rotate(-108deg) saturate(1.6)', swatch: '#ba1a1a', owned: false },
    { id: 'violet', name: 'Deep Violet', filter: 'hue-rotate(214deg) saturate(1.3)', swatch: '#7a4ddb', owned: false },
    { id: 'ash', name: 'Ash Grey', filter: 'grayscale(0.9)', swatch: '#8b8f8b', owned: false },
  ],
  Hats: [
    { id: 'none', name: 'Bare head', filter: 'none', swatch: '#e3e2e2', icon: 'block', owned: true },
    { id: 'top', name: 'Top Hat', filter: 'none', swatch: '#3f4a36', icon: 'magic_button', owned: false },
    { id: 'crown', name: 'Crown', filter: 'none', swatch: '#fec700', icon: 'workspace_premium', owned: false },
  ],
  Trails: [
    { id: 'plain', name: 'No trail', filter: 'none', swatch: '#e3e2e2', icon: 'block', owned: true },
    { id: 'spark', name: 'Sparks', filter: 'none', swatch: '#4abdff', icon: 'auto_awesome', owned: false },
    { id: 'leaf', name: 'Leaves', filter: 'none', swatch: '#58cc02', icon: 'eco', owned: false },
  ],
};

function CustomizeScreen({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  const [tab, setTab] = useState<keyof typeof cosmetics>('Skins');
  const [chosen, setChosen] = useState('green');
  const items = cosmetics[tab] ?? [];
  const skin = cosmetics.Skins?.find((item) => item.id === chosen) ?? cosmetics.Skins?.[0];

  return (
    <PhoneShell vg>
      <header className="vg-header">
        <button aria-label="Back to profile" className="vg-iconbtn" onClick={() => dispatch({ type: 'GO_TO', screen: 'profile' })} type="button">
          <Icon name="arrow_back" outline />
        </button>
        <span className="vg-header-title">Your snake</span>
        <span className="vg-gems">
          <Icon name="diamond" />
          {state.xp}
        </span>
      </header>

      <div className="vg-screen fade-screen">
        <div className="vg-preview">
          <img alt="Your snake" src={logoMark} style={{ filter: skin?.filter }} />
          <span className="vg-preview-tag">{skin?.name ?? 'Default Green'}</span>
        </div>

        <p className="vg-note">
          <Icon name="info" outline />
          A preview only. Your pick is not saved yet, so the snake goes back to Default Green on reload.
        </p>

        <h2 className="vg-section-h">Customize</h2>
        <div className="vg-tabs">
          {Object.keys(cosmetics).map((name) => (
            <button className={tab === name ? 'active' : ''} key={name} onClick={() => setTab(name)} type="button">
              {name}
            </button>
          ))}
        </div>

        <div className="vg-grid">
          {items.map((item) => {
            const selected = tab === 'Skins' && item.id === chosen;

            return (
              <button
                className={`vg-swatch ${selected ? 'selected' : ''}`}
                disabled={!item.owned}
                key={item.id}
                onClick={() => (tab === 'Skins' ? setChosen(item.id) : undefined)}
                type="button"
              >
                <span className="vg-dot" style={{ background: item.swatch }}>
                  {!item.owned ? <Icon name="lock" /> : selected ? <Icon name="check" /> : item.icon ? <Icon name={item.icon} /> : null}
                </span>
                {item.name}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
          <button className="vg-btn vg-btn-ghost" onClick={() => dispatch({ type: 'GO_TO', screen: 'shop' })} type="button">
            <Icon name="storefront" />
            Go to shop
          </button>
        </div>
      </div>
      <VgNav current="profile" dispatch={dispatch} />
    </PhoneShell>
  );
}

type ShopItem = { name: string; icon: string; price: number; premium?: boolean };

const shopItems: ShopItem[] = [
  { name: 'Top Hat', icon: 'magic_button', price: 50 },
  { name: 'Sunglasses', icon: 'light_mode', price: 30 },
  { name: 'Bowtie', icon: 'checkroom', price: 20 },
  { name: 'Crown', icon: 'workspace_premium', price: 120, premium: true },
  { name: 'Spark Trail', icon: 'auto_awesome', price: 80 },
  { name: 'Leaf Trail', icon: 'eco', price: 45 },
  { name: 'Heart Refill', icon: 'favorite', price: 60 },
  { name: 'Streak Freeze', icon: 'ac_unit', price: 90, premium: true },
];

function ShopScreen({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  return (
    <PhoneShell vg>
      <header className="vg-header">
        <button aria-label="Back to profile" className="vg-iconbtn" onClick={() => dispatch({ type: 'GO_TO', screen: 'profile' })} type="button">
          <Icon name="arrow_back" outline />
        </button>
        <span className="vg-header-title">Shop</span>
        <span className="vg-gems">
          <Icon name="diamond" />
          {state.xp}
        </span>
      </header>

      <div className="vg-screen fade-screen">
        <h1 className="vg-h1">Snake Shop</h1>
        <p className="vg-sub">Accessories for your scaly companion.</p>

        <p className="vg-note">
          <Icon name="info" outline />
          Window shopping for now — buying is not wired up, so every price here is a label rather than a
          transaction.
        </p>

        <div className="vg-shop">
          {shopItems.map((item) => (
            <div className="vg-item" key={item.name}>
              {item.premium ? <span className="vg-badge">Premium</span> : null}
              <span className="vg-item-art">
                <Icon name={item.icon} />
              </span>
              <h3>{item.name}</h3>
              <span className="vg-price">
                <Icon name="diamond" />
                {item.price}
              </span>
              <button className="vg-buy" disabled title="Purchases are not available yet" type="button">
                Soon
              </button>
            </div>
          ))}
        </div>
      </div>
      <VgNav current="profile" dispatch={dispatch} />
    </PhoneShell>
  );
}

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isProgressReady, setIsProgressReady] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const userId = session?.user.id;

  useEffect(() => {
    let isMounted = true;

    getCurrentSession()
      .then((currentSession) => {
        if (!isMounted) return;
        setSession(currentSession);
        setIsAuthReady(true);
      })
      .catch(() => {
        if (!isMounted) return;
        setSession(null);
        setIsAuthReady(true);
      });

    const unsubscribe = subscribeToAuthChanges((_event, nextSession) => {
      setSession(nextSession);
      setIsProgressReady(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    if (!userId) return;

    let isMounted = true;

    getLearningProgress(userId)
      .then((progress) => {
        if (!isMounted) return;

        if (progress) {
          dispatch({
            type: 'HYDRATE_PROGRESS',
            progress: {
              goal: progress.goal ?? '',
              experience: progress.experience ?? '',
              language: progress.language,
              xp: progress.xp,
              streak: progress.streak,
              hearts: progress.hearts,
              completedLessons: progress.completed_lessons,
              profileStartedAt: progress.started_at,
            },
          });
        } else {
          dispatch({ type: 'GO_TO', screen: 'goal' });
        }

        setIsProgressReady(true);
      })
      .catch((error) => {
        if (!isMounted) return;
        dispatch({
          type: 'SET_SYNC_MESSAGE',
          message: `Progress is device-only for now: ${getErrorMessage(error)}`,
        });
        setIsProgressReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthReady, userId]);

  useEffect(() => {
    if (!userId || !isProgressReady) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      upsertLearningProgress({
        user_id: userId,
        goal: state.goal || null,
        experience: state.experience || null,
        language: state.language,
        xp: state.xp,
        streak: state.streak,
        hearts: state.hearts,
        completed_lessons: state.completedLessons,
      })
        .then(() => {
          dispatch({ type: 'SET_SYNC_MESSAGE', message: '' });
        })
        .catch((error) => {
          dispatch({
            type: 'SET_SYNC_MESSAGE',
            message: `Could not save progress: ${getErrorMessage(error)}`,
          });
        });
    }, 400);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [state.goal, state.experience, state.language, state.xp, state.streak, state.hearts, state.completedLessons, userId, isProgressReady]);

  async function handleSignOut() {
    await signOut();
    setSession(null);
    setIsProgressReady(false);
    dispatch({ type: 'GO_TO', screen: 'auth' });
  }

  if (!isAuthReady) {
    return (
      <PhoneShell>
        <div className="screen centered">
          <div className="loading-mascot">🐍</div>
        </div>
      </PhoneShell>
    );
  }

  switch (state.screen) {
    case 'onboarding':
      return <OnboardingScreen state={state} dispatch={dispatch} />;
    case 'auth':
      return <AuthScreen state={state} dispatch={dispatch} onAuthenticated={setSession} />;
    case 'goal':
      return (
        <ChoiceCards
          title="Why are you learning Python?"
          subtitle="We will tune the course to your goal."
          options={[
            { icon: '💼', title: 'For work', text: 'Automation, data, backend' },
            { icon: '🎓', title: 'For school', text: 'Exams, projects, contests' },
            { icon: '✨', title: 'Out of curiosity', text: 'Understand how programs are written' },
            { icon: '🚀', title: 'To switch careers', text: 'A start in development' },
          ]}
          onSelect={(goal) => dispatch({ type: 'SET_GOAL', goal })}
        />
      );
    case 'experience':
      return (
        <ChoiceCards
          title="What is your experience?"
          subtitle="We will keep the first lesson comfortable."
          options={[
            { icon: '🌱', title: 'Beginner', text: 'Writing code for the first time' },
            { icon: '🧩', title: 'Know the basics', text: 'Comfortable with variables and conditions' },
            { icon: '💪', title: 'Confident', text: 'Want to sharpen my Python' },
          ]}
          onSelect={(experience) => dispatch({ type: 'SET_EXPERIENCE', experience })}
        />
      );
    case 'language':
      return <LanguageScreen dispatch={dispatch} />;
    case 'lesson':
      return <LessonScreen state={state} dispatch={dispatch} />;
    case 'result':
      return <ResultScreen state={state} dispatch={dispatch} />;
    case 'progress':
      return <ProgressScreen state={state} dispatch={dispatch} />;
    case 'league':
      return <LeagueScreen state={state} dispatch={dispatch} />;
    case 'profile':
      return <ProfileScreen state={state} dispatch={dispatch} onSignOut={() => void handleSignOut()} userEmail={session?.user.email ?? ''} />;
    case 'customize':
      return <CustomizeScreen state={state} dispatch={dispatch} />;
    case 'shop':
      return <ShopScreen state={state} dispatch={dispatch} />;
    case 'home':
    default:
      return <HomeScreen state={state} dispatch={dispatch} />;
  }
}
