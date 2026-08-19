import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

import { en } from './en';
import { ru } from './ru';

/**
 * Interface language.
 *
 * The app teaches in text, so a learner who does not read English meets two
 * problems at once: the concept and the sentence explaining it. Russian is the
 * first audience, so it is the first translation.
 *
 * Strings live in one flat dictionary keyed by a dotted path. Flat because the
 * lookup is then a plain object read with no walking, and because a missing key
 * shows up immediately as the key itself rather than as an empty space.
 */

export type Language = 'en' | 'ru';
export type StringKey = keyof typeof en;
export type Dictionary = Record<StringKey, string>;

const KEY = 'pylearn.language';

const dictionaries: Record<Language, Dictionary> = { en, ru };

/** the device's choice, when we have that language; English otherwise */
export function deviceLanguage(): Language {
  const first = getLocales()[0]?.languageCode ?? 'en';

  return first === 'ru' ? 'ru' : 'en';
}

export async function getStoredLanguage(): Promise<Language | null> {
  const stored = await AsyncStorage.getItem(KEY);

  return stored === 'ru' || stored === 'en' ? stored : null;
}

export async function storeLanguage(language: Language): Promise<void> {
  await AsyncStorage.setItem(KEY, language);
}

/**
 * Looks a string up, filling in {placeholders}.
 *
 * A missing key returns the key. That is deliberate: an English sentence
 * appearing in a Russian screen is easy to miss in review, whereas
 * `profile.signOut` is not.
 */
export function translate(
  language: Language,
  key: StringKey,
  values?: Record<string, string | number>,
): string {
  const table = dictionaries[language] ?? en;
  // widened on purpose: `as const` narrows each entry to its own literal, which
  // makes the substitution below a type error against the original string
  const template: string = table[key] ?? en[key] ?? key;

  if (!values) return template;

  return Object.entries(values).reduce<string>(
    (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
    template,
  );
}
