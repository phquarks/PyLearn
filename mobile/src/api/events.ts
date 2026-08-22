import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from './supabase';

/**
 * Crash reports and a handful of milestones.
 *
 * A crash usually arrives with the network already unhappy, or with the app in
 * no state to await anything, so nothing here throws and nothing here is waited
 * on. A report that fails to send is written to disk and tried again on the
 * next launch; losing one is better than a reporter that crashes the crash.
 */

const QUEUE = 'pylearn.events.v1';
const MILESTONES = 'pylearn.milestones.v1';

export type EventKind = 'crash' | 'signup' | 'first_lesson' | 'day7';

type PendingEvent = {
  kind: EventKind;
  message: string;
  detail?: string;
};

const appVersion = String(Constants.expoConfig?.version ?? 'dev');

async function send(event: PendingEvent, userId: string | null): Promise<boolean> {
  const { error } = await supabase.from('app_events').insert({
    user_id: userId,
    kind: event.kind,
    // a runaway message would push the useful part out of the admin's view
    message: event.message.slice(0, 400),
    detail: event.detail?.slice(0, 4000) ?? null,
    app_version: appVersion,
    platform: Platform.OS,
  });

  return !error;
}

async function queue(event: PendingEvent): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE);
    const waiting = raw ? (JSON.parse(raw) as PendingEvent[]) : [];

    // a crash loop could otherwise fill the disk with the same report
    await AsyncStorage.setItem(QUEUE, JSON.stringify([...waiting, event].slice(-20)));
  } catch {
    /* nothing useful is left to do about a failure to record a failure */
  }
}

/** Fire-and-forget: never awaited by a caller that is already in trouble. */
export function report(event: PendingEvent, userId: string | null): void {
  void send(event, userId)
    .then((ok) => {
      if (!ok) void queue(event);
    })
    .catch(() => {
      void queue(event);
    });
}

export function reportCrash(error: unknown, where: string, userId: string | null): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack ?? '' : '';

  report({ kind: 'crash', message: `${where}: ${message}`, detail: stack }, userId);
}

/** Sends whatever failed to go out earlier. Called once the app is up. */
export async function flushEvents(userId: string | null): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE);

  if (!raw) return;

  const waiting = JSON.parse(raw) as PendingEvent[];
  const left: PendingEvent[] = [];

  for (const event of waiting) {
    const ok = await send(event, userId).catch(() => false);

    if (!ok) left.push(event);
  }

  if (left.length) {
    await AsyncStorage.setItem(QUEUE, JSON.stringify(left));
  } else {
    await AsyncStorage.removeItem(QUEUE);
  }
}

/**
 * Records a milestone the first time it happens and never again.
 *
 * The point of these three is one question — where do people stop — and that
 * only needs to know whether somebody got there, not how often.
 */
export async function milestone(kind: EventKind, userId: string | null): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(MILESTONES);
    const seen = raw ? (JSON.parse(raw) as string[]) : [];

    if (seen.includes(kind)) return;

    await AsyncStorage.setItem(MILESTONES, JSON.stringify([...seen, kind]));
    report({ kind, message: kind }, userId);
  } catch {
    /* a missed milestone is not worth an error in the learner's face */
  }
}
