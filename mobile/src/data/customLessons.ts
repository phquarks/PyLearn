import type { GeneratedQuestion } from '../api/ai';
import type { Lesson } from './courseTypes';

/**
 * Lessons that were not written by us.
 *
 * A generated lesson has to be playable by the same screen as every other
 * lesson — a second lesson player would be a second set of bugs — and that
 * screen finds its lesson by id. So generated lessons are registered here and
 * looked up alongside the course.
 *
 * Their ids are the negatives of their database ids. Negative because the
 * course numbers from 1 upward and `completed_lessons` is a flat list of those
 * numbers: a generated lesson that borrowed id 7 would mark unit 2 complete for
 * somebody who had never opened it. A number that can never be a course id is
 * the cheapest guarantee that cannot happen.
 */

const registry = new Map<number, Lesson>();

export function lessonIdFor(storedId: number): number {
  return -storedId;
}

export function isGenerated(lessonId: number): boolean {
  return lessonId < 0;
}

export function registerGeneratedLesson(
  storedId: number,
  title: string,
  questions: GeneratedQuestion[],
): Lesson {
  const lesson: Lesson = {
    id: lessonIdFor(storedId),
    title,
    icon: 'auto-awesome',
    questions: questions.map((question) => ({
      type: question.type,
      prompt: question.prompt,
      code: question.code ?? '',
      options: question.options,
      answer: question.answer,
      explanation: question.explanation,
      // a blank question without a code line has nowhere to put the blank, so
      // it degrades to a plain choice rather than rendering an empty bubble
    })) as Lesson['questions'],
  };

  registry.set(lesson.id, lesson);

  return lesson;
}

export function generatedLesson(lessonId: number): Lesson | undefined {
  return registry.get(lessonId);
}

/** Dropped on sign-out: the next person's practice is not this person's. */
export function forgetGeneratedLessons(): void {
  registry.clear();
}
