import { useEffect, useReducer, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type * as React from 'react';

import { getCurrentSession, signInWithEmail, signOut, signUpWithEmail, subscribeToAuthChanges } from './api/auth';
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
  | 'profile';

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
    title: 'Python за 5 минут в день',
    text: 'Короткие задания, быстрый фидбек и путь от первых переменных до уверенного кода.',
  },
  {
    icon: '⚡',
    title: 'Учись через практику',
    text: 'Выбирай ответы, собирай строки кода и исправляй ошибки прямо в уроках.',
  },
  {
    icon: '🔥',
    title: 'Держи серию',
    text: 'Зарабатывай XP, береги сердца и открывай новые темы каждый день.',
  },
  {
    icon: '🏆',
    title: 'Готов к первому уроку?',
    text: 'Начнем с основ Python и сделаем синтаксис понятным без скучной теории.',
  },
];

const lessons: Lesson[] = [
  {
    id: 1,
    title: 'Переменные',
    icon: '📦',
    color: '#58CC02',
    questions: [
      {
        type: 'choice',
        prompt: 'Что создаст переменную name со значением "Ada"?',
        options: ['name = "Ada"', 'let name = "Ada"', 'var name: Ada', 'name <- "Ada"'],
        answer: 'name = "Ada"',
        explanation: 'В Python переменная создается через имя, знак = и значение.',
      },
      {
        type: 'blank',
        prompt: 'Заполни пропуск, чтобы age стал числом.',
        code: 'age = ___',
        options: ['16', '"16"', 'sixteen', 'true'],
        answer: '16',
        explanation: 'Число записывается без кавычек, а строка - в кавычках.',
      },
      {
        type: 'blocks',
        prompt: 'Собери код, который сохраняет город в переменную.',
        options: ['city', '=', '"Almaty"'],
        answer: ['city', '=', '"Almaty"'],
        explanation: 'Слева имя переменной, затем =, справа значение.',
      },
      {
        type: 'bug',
        prompt: 'Где ошибка в коде?',
        code: 'score == 10',
        options: ['Нужен один знак =', 'Нужны кавычки', 'Нужна точка с запятой', 'Ошибки нет'],
        answer: 'Нужен один знак =',
        explanation: '== сравнивает значения. Для присваивания нужен один знак =.',
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
        prompt: 'Что выведет текст на экран?',
        options: ['print("Hello")', 'show("Hello")', 'echo "Hello"', 'console.log("Hello")'],
        answer: 'print("Hello")',
        explanation: 'Функция print() выводит значение в консоль Python.',
      },
      {
        type: 'blank',
        prompt: 'Выведи значение переменной total.',
        code: '___(total)',
        options: ['print', 'input', 'str', 'len'],
        answer: 'print',
        explanation: 'print(total) показывает текущее значение переменной total.',
      },
      {
        type: 'blocks',
        prompt: 'Собери вывод строки "Python!".',
        options: ['print', '(', '"Python!"', ')'],
        answer: ['print', '(', '"Python!"', ')'],
        explanation: 'Аргумент функции print помещается в круглые скобки.',
      },
      {
        type: 'bug',
        prompt: 'Что сломает этот код?',
        code: 'print(Hello)',
        options: ['Hello без кавычек', 'Лишние скобки', 'Нужен знак =', 'Ничего'],
        answer: 'Hello без кавычек',
        explanation: 'Текстовая строка должна быть в кавычках: print("Hello").',
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
        prompt: 'Какой оператор проверяет условие?',
        options: ['if', 'when', 'check', 'case'],
        answer: 'if',
        explanation: 'if запускает блок кода, когда условие истинно.',
      },
      {
        type: 'blank',
        prompt: 'Заполни пропуск.',
        code: 'if points > 10:\n    print("win")\n___:\n    print("try again")',
        options: ['else', 'other', 'elif', 'again'],
        answer: 'else',
        explanation: 'else выполняется, если условие в if не сработало.',
      },
      {
        type: 'blocks',
        prompt: 'Собери простое условие.',
        options: ['if', 'age >= 18', ':'],
        answer: ['if', 'age >= 18', ':'],
        explanation: 'В Python строка условия заканчивается двоеточием.',
      },
      {
        type: 'bug',
        prompt: 'Какая ошибка здесь?',
        code: 'if temperature > 30\n    print("hot")',
        options: ['Нет двоеточия', 'Нужен ;', 'Нельзя использовать >', 'print неверный'],
        answer: 'Нет двоеточия',
        explanation: 'После условия if обязательно ставится двоеточие.',
      },
    ],
  },
  {
    id: 4,
    title: 'Циклы',
    icon: '🔁',
    color: '#CE82FF',
    questions: [
      {
        type: 'choice',
        prompt: 'Как пройти по каждому числу в списке nums?',
        options: ['for n in nums:', 'each n of nums:', 'loop nums as n:', 'while n in nums:'],
        answer: 'for n in nums:',
        explanation: 'for перебирает элементы последовательности по одному.',
      },
      {
        type: 'blank',
        prompt: 'Повтори действие 3 раза.',
        code: 'for i in ___(3):\n    print(i)',
        options: ['range', 'repeat', 'loop', 'times'],
        answer: 'range',
        explanation: 'range(3) создает последовательность 0, 1, 2.',
      },
      {
        type: 'blocks',
        prompt: 'Собери цикл while.',
        options: ['while', 'lives > 0', ':'],
        answer: ['while', 'lives > 0', ':'],
        explanation: 'while работает, пока условие истинно.',
      },
      {
        type: 'bug',
        prompt: 'Что здесь не так?',
        code: 'for item in cart\n    print(item)',
        options: ['Нет двоеточия', 'Нужен else', 'item должен быть числом', 'cart в кавычках'],
        answer: 'Нет двоеточия',
        explanation: 'Строки for и while в Python заканчиваются двоеточием.',
      },
    ],
  },
  {
    id: 5,
    title: 'Списки',
    icon: '📋',
    color: '#FF9600',
    questions: [
      {
        type: 'choice',
        prompt: 'Как создать список фруктов?',
        options: ['fruits = ["apple", "pear"]', 'fruits = ("apple", "pear")', 'fruits = {"apple"}', 'fruits = <apple, pear>'],
        answer: 'fruits = ["apple", "pear"]',
        explanation: 'Списки в Python записываются в квадратных скобках.',
      },
      {
        type: 'blank',
        prompt: 'Получить первый элемент списка.',
        code: 'first = names[___]',
        options: ['0', '1', 'first', '-'],
        answer: '0',
        explanation: 'Индексация списков начинается с нуля.',
      },
      {
        type: 'blocks',
        prompt: 'Добавь "tea" в список drinks.',
        options: ['drinks', '.', 'append', '(', '"tea"', ')'],
        answer: ['drinks', '.', 'append', '(', '"tea"', ')'],
        explanation: 'Метод append добавляет новый элемент в конец списка.',
      },
      {
        type: 'bug',
        prompt: 'Почему код не получит первый элемент?',
        code: 'letters = ["a", "b"]\nprint(letters[1])',
        options: ['Индекс 1 - второй элемент', 'Нужны круглые скобки', 'Список пустой', 'print нельзя со списком'],
        answer: 'Индекс 1 - второй элемент',
        explanation: 'letters[0] - первый элемент, letters[1] - второй.',
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

function PhoneShell({ children, withNav = false }: { children: React.ReactNode; withNav?: boolean }) {
  return (
    <main className="python-app">
      <section className={`phone-shell ${withNav ? 'phone-shell-nav' : ''}`}>{children}</section>
    </main>
  );
}

function TopStats({ state }: { state: State }) {
  return (
    <div className="top-stats">
      <span>🔥 {state.streak}</span>
      <span>❤️ {state.hearts}</span>
      <span>💎 {state.xp}</span>
    </div>
  );
}

function BottomNav({ current, dispatch }: { current: Screen; dispatch: React.Dispatch<Action> }) {
  const tabs: { screen: Screen; icon: string; label: string }[] = [
    { screen: 'home', icon: '⌂', label: 'Главная' },
    { screen: 'progress', icon: '▥', label: 'Прогресс' },
    { screen: 'league', icon: '♕', label: 'Лига' },
    { screen: 'profile', icon: '◉', label: 'Профиль' },
  ];
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.screen === current),
  );

  return (
    <nav
      aria-label="Основная навигация"
      className={`bottom-nav bottom-nav-active-${activeIndex}`}
      style={{ '--active-index': activeIndex } as React.CSSProperties}
    >
      <span className="liquid-pill" aria-hidden="true" />
      {tabs.map((tab) => (
        <button
          className={current === tab.screen ? 'active' : ''}
          key={tab.screen}
          onClick={() => dispatch({ type: 'GO_TO', screen: tab.screen })}
        >
          <span>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

function OnboardingScreen({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  const slide = onboardingSlides[state.onboardingIndex] ?? onboardingSlides[0]!;

  return (
    <PhoneShell>
      <div className="screen fade-screen onboarding">
        <div className="brand-row">
          <span className="mascot">🐍</span>
          <strong>PyLingo</strong>
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
            {state.onboardingIndex === onboardingSlides.length - 1 ? 'Начать' : 'Далее'}
          </AppButton>
          <button className="ghost-link" onClick={() => dispatch({ type: 'GO_TO', screen: 'auth' })}>
            Уже есть аккаунт
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
        setStatus('Проверьте почту и подтвердите регистрацию, затем войдите.');
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
          <span className="mascot">🐍</span>
          <strong>PyLingo</strong>
        </div>
        <h1>{state.authMode === 'login' ? 'С возвращением!' : 'Создай профиль'}</h1>
        <div className="mode-tabs">
          <button className={state.authMode === 'login' ? 'active' : ''} onClick={() => dispatch({ type: 'SET_AUTH_MODE', mode: 'login' })}>
            Войти
          </button>
          <button
            className={state.authMode === 'register' ? 'active' : ''}
            onClick={() => dispatch({ type: 'SET_AUTH_MODE', mode: 'register' })}
          >
            Зарегистрироваться
          </button>
        </div>
        <div className="form-stack">
          <input aria-label="Email" onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" value={email} />
          <input
            aria-label="Пароль"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Пароль"
            type="password"
            value={password}
          />
        </div>
        {error ? <p className="auth-alert error">{error}</p> : null}
        {status ? <p className="auth-alert success">{status}</p> : null}
        <AppButton disabled={!canSubmit}>{isSubmitting ? 'Подключаемся...' : 'Продолжить'}</AppButton>
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
    ['🐍', 'Python', 'Активно'],
    ['🟨', 'JavaScript', 'Скоро'],
    ['☕', 'Java', 'Скоро'],
    ['⚙️', 'C++', 'Скоро'],
    ['🦀', 'Rust', 'Скоро'],
    ['💎', 'Ruby', 'Скоро'],
  ];

  return (
    <PhoneShell>
      <div className="screen fade-screen">
        <div className="mini-header">
          <span>💻</span>
          <div>
            <strong>Выберите язык</strong>
            <p>Пока доступен первый курс.</p>
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

function HomeScreen({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  return (
    <PhoneShell withNav>
      <div className="screen fade-screen home-screen">
        <TopStats state={state} />
        <section className="home-hero">
          <div>
            <span>Модуль 1</span>
            <h1>Python Basics</h1>
            <p>Открой 5 уроков и собери первую программу.</p>
          </div>
          <div className="snake-medal">🐍</div>
        </section>
        <section className="lesson-path">
          {lessons.map((lesson, index) => {
            const previousLesson = lessons[index - 1];
            const unlocked = index === 0 || (previousLesson ? state.completedLessons.includes(previousLesson.id) : false);
            const complete = state.completedLessons.includes(lesson.id);

            return (
              <div className={`path-row path-row-${index % 2 === 0 ? 'left' : 'right'}`} key={lesson.id}>
                <button
                  className={`lesson-node ${complete ? 'complete' : ''} ${!unlocked ? 'locked' : ''}`}
                  disabled={!unlocked}
                  style={{ '--lesson-color': lesson.color } as React.CSSProperties}
                  onClick={() => dispatch({ type: 'START_LESSON', lessonId: lesson.id })}
                >
                  <span>{complete ? '✓' : unlocked ? lesson.icon : '🔒'}</span>
                </button>
                <div className="lesson-label">
                  <strong>{lesson.title}</strong>
                  <small>{unlocked ? '4 задания' : 'Заблокировано'}</small>
                </div>
              </div>
            );
          })}
        </section>
      </div>
      <BottomNav current="home" dispatch={dispatch} />
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
      <PhoneShell>
        <div className="screen centered">
          <AppButton onClick={() => dispatch({ type: 'GO_TO', screen: 'home' })}>Вернуться домой</AppButton>
        </div>
      </PhoneShell>
    );
  }

  const progress = ((session.questionIndex + Number(session.answered)) / lesson.questions.length) * 100;

  return (
    <PhoneShell>
      <div className={`screen fade-screen lesson-screen ${session.shake ? 'shake' : ''}`} onAnimationEnd={() => dispatch({ type: 'STOP_SHAKE' })}>
        <div className="lesson-top">
          <button aria-label="Выйти" onClick={() => dispatch({ type: 'GO_TO', screen: 'home' })}>
            ×
          </button>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="question-card">
          <small>
            {lesson.icon} {lesson.title} · {session.questionIndex + 1}/{lesson.questions.length}
          </small>
          <h1>{question.prompt}</h1>
          {'code' in question ? <pre>{question.code}</pre> : null}
        </div>
        <QuestionInput question={question} selected={selected} dispatch={dispatch} answered={session.answered} />
        {session.answered ? (
          <div className={`feedback ${session.isCorrect ? 'success' : 'error'}`}>
            {session.isCorrect ? <Confetti /> : null}
            <strong>{session.isCorrect ? 'Отлично!' : 'Почти!'}</strong>
            <p>{question.explanation}</p>
            <AppButton variant={session.isCorrect ? 'green' : 'orange'} onClick={() => dispatch({ type: 'CONTINUE_LESSON' })}>
              Продолжить
            </AppButton>
          </div>
        ) : (
          <div className="lesson-actions">
            <AppButton disabled={!canCheck} onClick={() => dispatch({ type: 'CHECK_ANSWER' })}>
              Проверить
            </AppButton>
          </div>
        )}
      </div>
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
      <div className="block-builder">
        <div className="drop-zone">
          {selectedBlocks.length ? selectedBlocks.map((block) => <span key={block}>{block}</span>) : <em>Собери строку кода</em>}
        </div>
        <div className="answer-grid code-blocks">
          {question.options.map((option) => (
            <button
              className={selectedBlocks.includes(option) ? 'selected' : ''}
              disabled={answered}
              key={option}
              onClick={() => dispatch({ type: 'TOGGLE_BLOCK', value: option })}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="answer-grid">
      {question.options.map((option) => (
        <button
          className={selected === option ? 'selected' : ''}
          disabled={answered}
          key={option}
          onClick={() => dispatch({ type: 'SELECT_ANSWER', value: option })}
        >
          {option}
        </button>
      ))}
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
    <PhoneShell>
      <div className="screen fade-screen result-screen">
        <Confetti />
        <div className="result-mascot">🐍</div>
        <h1>Урок завершен!</h1>
        <p>{result?.title ?? 'Python Basics'} стал ближе.</p>
        <div className="result-grid">
          <div>
            <span>💎</span>
            <strong>+{result?.xp ?? 0} XP</strong>
            <small>получено</small>
          </div>
          <div>
            <span>🎯</span>
            <strong>{result?.accuracy ?? 0}%</strong>
            <small>точность</small>
          </div>
        </div>
        <AppButton onClick={() => dispatch({ type: 'GO_TO', screen: 'home' })}>Продолжить</AppButton>
      </div>
    </PhoneShell>
  );
}

function ProgressScreen({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  const bars = [35, 55, 25, 70, 45, 80, Math.min(100, state.completedLessons.length * 20 + 20)];

  return (
    <PhoneShell withNav>
      <div className="screen fade-screen">
        <TopStats state={state} />
        <div className="section-title">
          <h1>Прогресс</h1>
          <p>{state.completedLessons.length} из 5 уроков пройдено</p>
        </div>
        <div className="chart-card">
          {bars.map((height, index) => (
            <div className="bar-column" key={index}>
              <span style={{ height: `${height}%` }} />
              <small>{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][index]}</small>
            </div>
          ))}
        </div>
        <div className="topic-list">
          {lessons.map((lesson) => (
            <div key={lesson.id}>
              <span>{lesson.icon}</span>
              <strong>{lesson.title}</strong>
              <small>{state.completedLessons.includes(lesson.id) ? 'готово' : 'впереди'}</small>
            </div>
          ))}
        </div>
      </div>
      <BottomNav current="progress" dispatch={dispatch} />
    </PhoneShell>
  );
}

function LeagueScreen({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  const users = [
    ['🥇', 'Mira', state.xp + 80],
    ['🥈', 'Ayan', state.xp + 35],
    ['🥉', 'Вы', state.xp],
    ['4', 'Dana', Math.max(40, state.xp - 25)],
    ['5', 'Tim', Math.max(25, state.xp - 70)],
  ];

  return (
    <PhoneShell withNav>
      <div className="screen fade-screen">
        <TopStats state={state} />
        <div className="league-hero">
          <span>🏆</span>
          <h1>Золотая лига</h1>
          <p>Заглушка рейтинга для недельного соревнования.</p>
        </div>
        <div className="leaderboard">
          {users.map(([place, name, xp]) => (
            <div className={name === 'Вы' ? 'me' : ''} key={name}>
              <span>{place}</span>
              <strong>{name}</strong>
              <small>{xp} XP</small>
            </div>
          ))}
        </div>
      </div>
      <BottomNav current="league" dispatch={dispatch} />
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
  const badges = [
    ['🔥', '3 дня', true],
    ['📦', 'Переменные', state.completedLessons.includes(1)],
    ['🖨️', 'Вывод', state.completedLessons.includes(2)],
    ['🔁', 'Циклы', state.completedLessons.includes(4)],
    ['👑', 'Мастер Python', false],
    ['⚡', 'Без ошибок', false],
  ];

  return (
    <PhoneShell withNav>
      <div className="screen fade-screen profile-screen">
        <TopStats state={state} />
        <section className="profile-card">
          <div className="avatar">🐍</div>
          <h1>{userEmail || 'Python Learner'}</h1>
          <p>В обучении с {new Date(state.profileStartedAt).toLocaleDateString('ru-RU')}</p>
          {state.syncMessage ? <small className="sync-note">{state.syncMessage}</small> : <small className="sync-note">Supabase синхронизирован</small>}
        </section>
        <div className="profile-stats">
          <div>
            <strong>{state.streak}</strong>
            <small>streak</small>
          </div>
          <div>
            <strong>{state.xp}</strong>
            <small>XP</small>
          </div>
          <div>
            <strong>{state.completedLessons.length}</strong>
            <small>уроков</small>
          </div>
        </div>
        <section className="badges">
          <h2>Достижения</h2>
          <div>
            {badges.map(([icon, title, open]) => (
              <span className={open ? '' : 'locked'} key={String(title)}>
                <b>{icon}</b>
                {title}
              </span>
            ))}
          </div>
        </section>
        <AppButton variant="white" onClick={onSignOut}>
          Выйти
        </AppButton>
      </div>
      <BottomNav current="profile" dispatch={dispatch} />
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
          message: `Прогресс пока только на устройстве: ${getErrorMessage(error)}`,
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
            message: `Не удалось сохранить прогресс: ${getErrorMessage(error)}`,
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
          title="Почему вы учите Python?"
          subtitle="Подстроим курс под вашу цель."
          options={[
            { icon: '💼', title: 'Для работы', text: 'Автоматизация, данные, backend' },
            { icon: '🎓', title: 'Для учебы', text: 'Зачеты, проекты, олимпиады' },
            { icon: '✨', title: 'Из интереса', text: 'Понять, как пишут программы' },
            { icon: '🚀', title: 'Сменить профессию', text: 'Старт в разработке' },
          ]}
          onSelect={(goal) => dispatch({ type: 'SET_GOAL', goal })}
        />
      );
    case 'experience':
      return (
        <ChoiceCards
          title="Какой у вас опыт?"
          subtitle="Первый урок будет комфортным."
          options={[
            { icon: '🌱', title: 'Новичок', text: 'Пишу код впервые' },
            { icon: '🧩', title: 'Знаю основы', text: 'Понимаю переменные и условия' },
            { icon: '💪', title: 'Уверенный уровень', text: 'Хочу закрепить Python' },
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
    case 'home':
    default:
      return <HomeScreen state={state} dispatch={dispatch} />;
  }
}
