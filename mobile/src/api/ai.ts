import { supabase } from './supabase';
import type { Language } from '../i18n';

/**
 * The phone's half of the AI coach.
 *
 * There is no API key here, and there is not meant to be. Everything goes
 * through the `ai` edge function, which knows who is asking from their Supabase
 * session and keeps a daily budget per account. That also means every call can
 * fail for an ordinary reason — no signal, budget spent, the model having a bad
 * minute — so nothing here is allowed to be load-bearing. The lesson works
 * without it; the coach is what makes it better.
 */

export type AiFailure = 'quota' | 'offline' | 'unavailable';

export class AiError extends Error {
  constructor(public reason: AiFailure, message: string) {
    super(message);
    this.name = 'AiError';
  }
}

type Task = 'mentor' | 'hint' | 'grade' | 'lesson';

async function call<T>(task: Task, language: Language, payload: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ai', {
    body: { task, language, payload },
  });

  if (error) {
    /* invoke() reports every non-2xx the same way, so the status has to come
       off the response it carried. 429 is the one worth naming: "you have used
       today's help" is a different sentence from "something is broken". */
    const response = (error as { context?: Response }).context;
    const status = response?.status;

    /* The learner is shown a calm sentence, which is right for them and useless
       for whoever has to fix it. The function sends the real reason in the body,
       so while developing it goes to the console rather than into a black hole
       — a retired model slug and a rejected API key are the same 502 from here,
       and telling them apart took a round of guessing once already. */
    if (__DEV__ && response) {
      void response
        .clone()
        .text()
        .then((body) => console.warn(`[ai:${task}] ${status} ${body}`))
        .catch(() => undefined);
    }

    if (status === 429) {
      throw new AiError('quota', 'Daily limit reached');
    }

    // a request that never reached the server has no status at all
    throw new AiError(status ? 'unavailable' : 'offline', error.message ?? 'AI is unavailable');
  }

  if (data && typeof data === 'object' && 'error' in data) {
    throw new AiError('unavailable', String((data as { message?: string }).message ?? 'AI is unavailable'));
  }

  return data as T;
}

/**
 * A question for the tutor.
 *
 * With `prompt` — the exercise on screen — the answer is withheld on purpose.
 * Without it there is nothing to withhold, so the same call becomes an ordinary
 * tutoring reply: explains the idea, still refuses to write whole programs. The
 * switch lives in the edge function, where the learner cannot flip it by
 * omitting a field the app was supposed to send.
 */
export function askMentor(
  language: Language,
  ask: { question: string; prompt?: string; code?: string; attempt?: string; about?: string },
): Promise<{ reply: string }> {
  return call('mentor', language, ask);
}

/** One rung of the hint ladder. Level 3 still stops short of the fix. */
export function askHint(
  language: Language,
  ask: { level: number; prompt: string; code?: string; attempt?: string; error?: string },
): Promise<{ reply: string; level: number }> {
  return call('hint', language, ask);
}

/**
 * Marks written Python against what the exercise asked for.
 *
 * Read, not run: there is no interpreter on the phone and no sandbox on the
 * server, so this is a judgement. It is a good one for exercises this size, and
 * it accepts working code that differs from the model answer — which a string
 * comparison never could, and which is the whole reason to have an editor at
 * all rather than another multiple choice.
 */
export function gradeCode(
  language: Language,
  ask: { code: string; goal: string; answer?: string },
): Promise<{ correct: boolean; feedback: string; slip: string }> {
  return call('grade', language, ask);
}

export type GeneratedQuestion = {
  type: 'choice' | 'blank' | 'bug';
  prompt: string;
  code?: string;
  options: string[];
  answer: string;
  explanation: string;
};

/** Builds a short lesson out of the learner's own recent wrong answers. */
export function buildPersonalLesson(
  language: Language,
  mistakes: { topic: string; prompt: string; chosen: string; answer: string }[],
): Promise<{ title: string; questions: GeneratedQuestion[] }> {
  return call('lesson', language, { mistakes });
}
