import AsyncStorage from '@react-native-async-storage/async-storage';

import { completeLesson, type AwardResult } from './progress';

/**
 * Lessons finished without a working connection.
 *
 * Since awarding moved to the server, a lesson finished on the underground is
 * not merely unsaved — it is gone, questions and all. The queue is what makes
 * the work survive the journey: the finished run is written to disk first, and
 * sent whenever the network comes back.
 *
 * Order is kept deliberately. Sending is stopped at the first failure rather
 * than skipping ahead, because the second lesson of a unit arriving before the
 * first would be recorded as a repeat and paid a third of its worth.
 */

const KEY = 'pylearn.queue.v1';

export type PendingLesson = {
  /** unique per entry, so a success removes exactly the one that succeeded */
  id: string;
  lessonId: number;
  correct: number;
  total: number;
  /** the day it was actually finished, not the day it is sent */
  day: string;
};

export async function readQueue(): Promise<PendingLesson[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);

    return raw ? (JSON.parse(raw) as PendingLesson[]) : [];
  } catch {
    // a corrupted queue must not wedge the app; better to lose it than to loop
    return [];
  }
}

async function write(queue: PendingLesson[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(queue));
}

export async function queueLesson(entry: Omit<PendingLesson, 'id'>): Promise<void> {
  const queue = await readQueue();

  queue.push({ ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });

  await write(queue);
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export type FlushOutcome = {
  /** the last totals the server returned, or null when nothing was sent */
  award: AwardResult | null;
  sent: number;
  left: number;
};

/**
 * Sends what is waiting, oldest first.
 *
 * Only the last award is handed back: each send returns the running totals, so
 * the final one already accounts for everything before it.
 */
export async function flushQueue(): Promise<FlushOutcome> {
  const queue = await readQueue();

  if (queue.length === 0) {
    return { award: null, sent: 0, left: 0 };
  }

  let award: AwardResult | null = null;
  let sent = 0;

  for (const entry of queue) {
    try {
      award = await completeLesson(entry.lessonId, entry.correct, entry.total, entry.day);
      sent += 1;
    } catch {
      // still offline, or the server refused this one: stop and keep the rest
      break;
    }
  }

  const left = queue.slice(sent);

  await write(left);

  return { award, sent, left: left.length };
}
