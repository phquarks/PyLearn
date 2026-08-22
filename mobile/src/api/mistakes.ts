import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';
import type { GeneratedQuestion } from './ai';

/**
 * The record of what somebody keeps getting wrong.
 *
 * Kept on the server rather than on the phone, because it is the one thing here
 * worth surviving a reinstall: a fortnight of wrong answers is what makes the
 * generated lessons about this learner instead of about Python in general.
 *
 * A mistake that cannot be sent waits on disk. It is never awaited by the
 * lesson — being wrong should cost a heart, not a pause.
 */

const QUEUE = 'pylearn.mistakes.v1';

export type Mistake = {
  id: number;
  topic: string;
  prompt: string;
  chosen: string;
  answer: string;
};

type NewMistake = {
  lessonId: number;
  topic: string;
  prompt: string;
  chosen: string;
  answer: string;
};

function row(mistake: NewMistake, userId: string) {
  return {
    user_id: userId,
    lesson_id: mistake.lessonId,
    topic: mistake.topic.slice(0, 120),
    // trimmed at the edges the prompt is likely to be padded with, not the
    // middle, which is where the actual question lives
    prompt: mistake.prompt.slice(0, 600),
    chosen: mistake.chosen.slice(0, 300),
    answer: mistake.answer.slice(0, 300),
  };
}

/** Fire-and-forget. A wrong answer is not a moment to block the screen on. */
export function recordMistake(mistake: NewMistake, userId: string | null): void {
  if (!userId) return;

  void supabase
    .from('learner_mistakes')
    .insert(row(mistake, userId))
    .then(async ({ error }) => {
      if (!error) return;

      try {
        const raw = await AsyncStorage.getItem(QUEUE);
        const waiting = raw ? (JSON.parse(raw) as NewMistake[]) : [];

        /* Capped, and at the newest rather than the oldest. A long stretch
           offline says more about the last twenty questions than the first. */
        await AsyncStorage.setItem(QUEUE, JSON.stringify([...waiting, mistake].slice(-40)));
      } catch {
        /* a lost mistake costs a slightly less personal lesson, nothing more */
      }
    });
}

/** Sends what could not be sent earlier. Called when the app comes up. */
export async function flushMistakes(userId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE);

  if (!raw) return;

  const waiting = JSON.parse(raw) as NewMistake[];

  if (waiting.length === 0) {
    await AsyncStorage.removeItem(QUEUE);
    return;
  }

  const { error } = await supabase
    .from('learner_mistakes')
    .insert(waiting.map((mistake) => row(mistake, userId)));

  if (!error) await AsyncStorage.removeItem(QUEUE);
}

/**
 * The mistakes no lesson has been built from yet, newest first.
 *
 * Unused only, so tapping twice in a row does not produce the same lesson: the
 * point is the confusion that is still live, not the whole history.
 */
export async function unusedMistakes(userId: string, limit = 12): Promise<Mistake[]> {
  const { data, error } = await supabase
    .from('learner_mistakes')
    .select('id, topic, prompt, chosen, answer')
    .eq('user_id', userId)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((item) => ({
    id: Number(item.id),
    topic: String(item.topic ?? ''),
    prompt: String(item.prompt ?? ''),
    chosen: String(item.chosen ?? ''),
    answer: String(item.answer ?? ''),
  }));
}

/** How many are waiting, which is what decides whether the button is offered. */
export async function countUnused(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('learner_mistakes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('used_at', null);

  if (error) throw error;

  return count ?? 0;
}

export async function markUsed(ids: number[]): Promise<void> {
  if (ids.length === 0) return;

  const { error } = await supabase.rpc('mark_mistakes_used', { ids });

  if (error) throw error;
}

export type StoredLesson = {
  id: number;
  title: string;
  questions: GeneratedQuestion[];
  createdAt: string;
};

export async function saveGeneratedLesson(
  userId: string,
  title: string,
  questions: GeneratedQuestion[],
): Promise<StoredLesson> {
  const { data, error } = await supabase
    .from('generated_lessons')
    .insert({ user_id: userId, title, questions })
    .select('id, title, questions, created_at')
    .single();

  if (error) throw error;

  return {
    id: Number(data.id),
    title: String(data.title),
    questions: data.questions as GeneratedQuestion[],
    createdAt: String(data.created_at),
  };
}

export async function myGeneratedLessons(userId: string, limit = 10): Promise<StoredLesson[]> {
  const { data, error } = await supabase
    .from('generated_lessons')
    .select('id, title, questions, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((item) => ({
    id: Number(item.id),
    title: String(item.title),
    questions: item.questions as GeneratedQuestion[],
    createdAt: String(item.created_at),
  }));
}

export async function removeGeneratedLesson(id: number): Promise<void> {
  const { error } = await supabase.from('generated_lessons').delete().eq('id', id);

  if (error) throw error;
}
