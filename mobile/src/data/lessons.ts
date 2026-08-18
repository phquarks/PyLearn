/**
 * The course, assembled.
 *
 * The units themselves live in ./units, one file per stretch of the syllabus,
 * because a single module holding two hundred questions is impossible to move
 * around in. Everything the app imports still comes from here.
 */

import type { Unit } from './courseTypes';
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
 * Lesson ids are unique across the whole course, not per unit. Progress is
 * stored as a flat list of finished ids, so an id must never be reused or
 * renumbered — doing so would silently move somebody's completed lessons.
 */
export const units: Unit[] = [...foundation, ...collections, ...craft, ...applied];

/**
 * Every lesson in course order.
 *
 * Unlocking, progress counts and the lesson lookup all work off this flat view,
 * so units are free to be regrouped without any of that having to care.
 */
export const lessons = units.flatMap((unit) => unit.lessons);

/**
 * Units that cost nothing to get wrong.
 *
 * Hearts are meant to make carelessness cost something, but a beginner is wrong
 * constantly and has no gems to buy their way out — so on the first two units
 * the mechanic only ever meant "stop learning for half an hour". They start
 * where the learner has some footing.
 */
export const FREE_UNITS = 2;

export function costsHearts(lessonId: number): boolean {
  const unit = unitOfLesson(lessonId);

  return unit ? unit.id > FREE_UNITS : true;
}

/** the unit a lesson belongs to, or undefined for an id that no longer exists */
export function unitOfLesson(lessonId: number): Unit | undefined {
  return units.find((unit) => unit.lessons.some((lesson) => lesson.id === lessonId));
}

/** how many of a unit's lessons appear in the given list of finished ids */
export function unitDone(unit: Unit, completed: number[]): number {
  return unit.lessons.filter((lesson) => completed.includes(lesson.id)).length;
}
