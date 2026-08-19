import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

/**
 * The daily nudges.
 *
 * A streak is the whole shape of this app and it breaks silently, so without a
 * reminder it is a counter rather than a habit. The rule is: never on a day
 * already practised — a reminder that arrives after the lesson is finished
 * teaches people to ignore the next one.
 *
 * That rule is why these are one-off notifications rather than repeating daily
 * triggers: a repeat cannot skip an occurrence. Several days are scheduled
 * ahead so somebody who stops opening the app still hears from us, and the
 * whole queue is rebuilt whenever a lesson is finished — which is what drops
 * the rest of today.
 */

const ENABLED = 'pylearn.reminders.on';
const TIMES = 'pylearn.reminders.times';

/**
 * iOS keeps at most 64 pending local notifications and silently drops the rest,
 * so the queue is budgeted rather than assumed: more times a day means fewer
 * days ahead. Below the cap so nothing else the app schedules gets squeezed out.
 */
const MAX_PENDING = 56;
const MAX_DAYS_AHEAD = 7;

/** more than this in one day stops being a reminder and starts being nagging */
export const MAX_TIMES = 6;

export const DEFAULT_TIMES = ['19:00'];

export type ReminderSettings = { on: boolean; times: string[] };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function parseTime(value: string): { hour: number; minute: number } | null {
  const [hour, minute] = value.split(':').map((part) => Number.parseInt(part, 10));

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;

  return { hour, minute };
}

/** sorted, de-duplicated and capped: the order people expect to read them in */
export function tidyTimes(times: string[]): string[] {
  const clean = times.filter((value) => parseTime(value) !== null);

  return Array.from(new Set(clean)).sort().slice(0, MAX_TIMES);
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  const [on, raw] = await Promise.all([AsyncStorage.getItem(ENABLED), AsyncStorage.getItem(TIMES)]);
  const stored = tidyTimes((raw ?? '').split(',').filter(Boolean));

  return { on: on === 'on', times: stored.length ? stored : DEFAULT_TIMES };
}

/** true once the learner has been asked, whichever way they answered */
export async function remindersAnswered(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED)) !== null;
}

export async function askPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();

  if (current.granted) return true;

  // iOS only shows its own alert once ever; after a refusal this returns
  // without prompting, which is why the caller must cope with a plain false
  const asked = await Notifications.requestPermissionsAsync();

  return asked.granted;
}

function textFor(streak: number) {
  if (streak > 1) {
    return {
      title: `Your ${streak}-day streak is waiting`,
      body: 'Five minutes of Python keeps it alive.',
    };
  }

  return { title: 'Five minutes of Python?', body: 'One short lesson is enough for today.' };
}

/**
 * Rebuilds the whole queue.
 *
 * `practisedToday` is what makes the promise honest: when it is true the rest of
 * today is dropped, so finishing a lesson silences the day it was finished.
 */
export async function scheduleReminders(
  settings: ReminderSettings,
  streak: number,
  practisedToday: boolean,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const times = tidyTimes(settings.times);

  if (!settings.on || times.length === 0) return;

  const now = new Date();
  const text = textFor(streak);
  // fewer days when there are more times a day, so the total stays under the cap
  const days = Math.max(1, Math.min(MAX_DAYS_AHEAD, Math.floor(MAX_PENDING / times.length)));

  for (let day = 0; day < days; day += 1) {
    // today's remaining slots are dropped entirely once a lesson is finished
    if (day === 0 && practisedToday) continue;

    for (const value of times) {
      const at = parseTime(value);

      if (!at) continue;

      const when = new Date(now);
      when.setDate(now.getDate() + day);
      when.setHours(at.hour, at.minute, 0, 0);

      if (when.getTime() <= now.getTime()) continue;

      await Notifications.scheduleNotificationAsync({
        content: { title: text.title, body: text.body },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: when },
      });
    }
  }
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.multiSet([
    [ENABLED, settings.on ? 'on' : 'off'],
    [TIMES, tidyTimes(settings.times).join(',')],
  ]);
}

export async function clearReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.multiRemove([ENABLED, TIMES]);
}
