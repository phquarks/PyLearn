import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase environment variables are not configured yet.');
}

export const supabase = createClient(url ?? 'https://example.supabase.co', anonKey ?? 'missing-anon-key', {
  auth: {
    // On device there is no browser storage and no URL to read a session back
    // from, so the session lives in AsyncStorage and the redirect flow is off.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
