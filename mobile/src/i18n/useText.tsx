import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  deviceLanguage,
  getStoredLanguage,
  storeLanguage,
  translate,
  type Language,
  type StringKey,
} from './index';

/**
 * Language for the whole tree.
 *
 * Context rather than a module-level variable: changing the language has to
 * redraw every screen holding a string, and only a context does that. The
 * device's own language is the starting point, since somebody whose phone is in
 * Russian is unlikely to want an English app.
 */

type TextValue = {
  language: Language;
  t: (key: StringKey, values?: Record<string, string | number>) => string;
  setLanguage: (next: Language) => void;
};

const TextContext = createContext<TextValue>({
  language: 'en',
  t: (key) => translate('en', key),
  setLanguage: () => undefined,
});

export function TextProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(deviceLanguage);

  // a stored choice beats the device's, since it was made on purpose
  useEffect(() => {
    let alive = true;

    void getStoredLanguage().then((stored) => {
      if (alive && stored) setLanguageState(stored);
    });

    return () => {
      alive = false;
    };
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    void storeLanguage(next).catch(() => undefined);
  }, []);

  const value = useMemo<TextValue>(
    () => ({
      language,
      t: (key, values) => translate(language, key, values),
      setLanguage,
    }),
    [language, setLanguage],
  );

  return <TextContext.Provider value={value}>{children}</TextContext.Provider>;
}

export function useText() {
  return useContext(TextContext);
}
