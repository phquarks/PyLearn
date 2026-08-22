/**
 * The courses, assembled.
 *
 * The units themselves live in ./units, one file per stretch of syllabus,
 * because a single module holding three hundred questions is impossible to move
 * around in. Everything the app imports still comes from here.
 */

import type { Lesson, Unit, UnitTone } from './courseTypes';
import { generatedLesson, isGenerated } from './customLessons';
import { aiFoundations } from './units/aiFoundations';
import { aiPractice } from './units/aiPractice';
import { applied } from './units/applied';
import { collections } from './units/collections';
import { craft } from './units/craft';
import { foundation } from './units/foundation';

export * from './courseTypes';

export const onboardingSlides = [
  {
    icon: 'rocket',
    title: 'Python in 5 minutes a day',
    text: 'Short exercises, instant feedback, and a path from your first variable to confident code.',
  },
  {
    icon: 'bolt',
    title: 'Learn by doing',
    text: 'Pick answers, assemble lines of code, and fix bugs right inside the lessons.',
  },
  {
    icon: 'flame',
    title: 'Keep your streak',
    text: 'Earn XP, guard your hearts, and unlock new topics every day.',
  },
  {
    icon: 'trophy',
    title: 'Ready for your first lesson?',
    text: 'We start with the basics and make Python syntax click without dry theory.',
  },
];

/**
 * A course: one path, start to finish.
 *
 * Progress is one flat list of finished lesson ids across every course, so the
 * ids have to stay unique app-wide. Python holds 1-51 and the AI course starts
 * at 101 to leave the first course room to grow — a renumbering would silently
 * move somebody's completed lessons to different lessons.
 */
export type Course = {
  id: string;
  title: string;
  /** one line on the picker card, saying what the learner walks away with */
  blurb: string;
  icon: string;
  /** which accent the course is drawn in, so the two never look alike */
  tone: UnitTone;
  units: Unit[];
};

export const courses: Course[] = [
  {
    id: 'python',
    title: 'Python',
    blurb: 'From your first variable to classes, files and async.',
    icon: 'code',
    tone: 'primary',
    units: [...foundation, ...collections, ...craft, ...applied],
  },
  {
    id: 'ai',
    title: 'AI',
    blurb: 'How models actually work, prompting, and coding alongside one.',
    icon: 'psychology',
    tone: 'tertiary',
    units: [...aiFoundations, ...aiPractice],
  },
];

export const DEFAULT_COURSE = 'python';

/**
 * The course a stored value refers to.
 *
 * Profiles written before there was more than one course hold the string
 * 'Python' in this field, so the match is loose on purpose. An id nobody
 * recognises falls back to the first course rather than to an empty path.
 */
export function courseById(id: string): Course {
  const wanted = id.trim().toLowerCase();

  return courses.find((course) => course.id === wanted) ?? courses[0]!;
}

export function unitsOf(courseId: string): Unit[] {
  return courseById(courseId).units;
}

/** One course's lessons, in course order. */
export function lessonsOf(courseId: string): Lesson[] {
  return unitsOf(courseId).flatMap((unit) => unit.lessons);
}

/** Every unit in every course. Used for lookups, never for drawing a path. */
export const units: Unit[] = courses.flatMap((course) => course.units);

/** Every lesson in every course, which is what `completed_lessons` counts. */
export const lessons: Lesson[] = units.flatMap((unit) => unit.lessons);

/**
 * Units that cost nothing to get wrong, counted from the start of each course.
 *
 * Hearts are meant to make carelessness cost something, but a beginner is wrong
 * constantly and has no gems to buy their way out — so at the start of a course
 * the mechanic only ever meant "stop learning for half an hour". Counted per
 * course, because somebody arriving at the AI course is a beginner again.
 */
export const FREE_UNITS = 2;

export function costsHearts(lessonId: number): boolean {
  /* Practice built from your own mistakes is free, always. Charging for it
     would mean the learner who most needs the drill is the one who cannot
     afford to open it. */
  if (isGenerated(lessonId)) return false;

  const course = courses.find((entry) =>
    entry.units.some((unit) => unit.lessons.some((lesson) => lesson.id === lessonId)),
  );
  const at = course?.units.findIndex((unit) => unit.lessons.some((lesson) => lesson.id === lessonId));

  return at === undefined || at < 0 ? true : at >= FREE_UNITS;
}

/**
 * A lesson by id, from any course or from somebody's generated practice.
 *
 * Everything that used to reach for `lessons.find` goes through here, so the
 * lesson player never has to know which kind it is holding.
 */
export function lessonById(lessonId: number): Lesson | undefined {
  return isGenerated(lessonId)
    ? generatedLesson(lessonId)
    : lessons.find((lesson) => lesson.id === lessonId);
}

/** the unit a lesson belongs to, or undefined for an id that no longer exists */
export function unitOfLesson(lessonId: number): Unit | undefined {
  return units.find((unit) => unit.lessons.some((lesson) => lesson.id === lessonId));
}

/** how many of a unit's lessons appear in the given list of finished ids */
export function unitDone(unit: Unit, completed: number[]): number {
  return unit.lessons.filter((lesson) => completed.includes(lesson.id)).length;
}
