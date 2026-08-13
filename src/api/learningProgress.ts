import { supabase } from './supabaseClient';

export type LearningProgress = {
  user_id: string;
  goal: string | null;
  experience: string | null;
  language: string;
  xp: number;
  streak: number;
  hearts: number;
  completed_lessons: number[];
  started_at?: string;
  updated_at?: string;
};

export async function getLearningProgress(userId: string): Promise<LearningProgress | null> {
  const { data, error } = await supabase
    .from('learning_profiles')
    .select('user_id, goal, experience, language, xp, streak, hearts, completed_lessons, started_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertLearningProgress(progress: LearningProgress): Promise<void> {
  const { error } = await supabase.from('learning_profiles').upsert(
    {
      ...progress,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    throw error;
  }
}
