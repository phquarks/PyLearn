import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

/**
 * The profile picture.
 *
 * It is kept in two places on purpose. A copy lives in the app's own documents
 * so the picture is there instantly and without a network round trip, and a
 * copy goes to Supabase Storage so other learners see it in the League.
 *
 * The picker hands back a URI inside a system cache that iOS is free to empty,
 * which is why the local copy is made rather than the original path remembered.
 */

const KEY = 'pylearn.avatar.v1';
const BUCKET = 'avatars';

export async function getAvatar(): Promise<string> {
  const uri = await AsyncStorage.getItem(KEY);

  if (!uri) {
    return '';
  }

  // a reinstall leaves the remembered path pointing at nothing
  return new File(uri).exists ? uri : '';
}

/** deletes quietly: a missing old avatar is not a reason to fail the new one */
function discard(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    /* nothing to clean up */
  }
}

/**
 * Sends the picture up and returns its public URL.
 *
 * The path is the learner's own id followed by a filename, which is what the
 * storage policy checks — a learner can only ever write inside their own
 * folder. The timestamp in the name defeats CDN caching, which would otherwise
 * keep showing the previous face to everyone else.
 */
async function upload(file: File, userId: string): Promise<string> {
  const path = `${userId}/${Date.now()}.jpg`;
  const bytes = await file.bytes();

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return data.publicUrl;
}

export type PickedAvatar = { uri: string; url: string };

/**
 * Opens the photo library, stores the picture locally and uploads it.
 *
 * Returns empty strings when the learner backs out. A failed upload still keeps
 * the local copy and reports the reason: the picture showing on this phone but
 * not yet in the League is a better outcome than losing the choice entirely.
 */
export async function pickAvatar(userId: string): Promise<PickedAvatar> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error('PyLearn needs access to your photos to set a picture.');
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    // small on purpose: this file is about to cross the network and then be
    // shown at 44 points in a list
    quality: 0.6,
  });

  if (picked.canceled || !picked.assets[0]) {
    return { uri: '', url: '' };
  }

  const previous = await AsyncStorage.getItem(KEY);
  // the timestamp keeps the filename unique, so a new picture never has to
  // overwrite one that a mounted <Image> may still be reading
  const destination = new File(Paths.document, `avatar-${Date.now()}.jpg`);

  new File(picked.assets[0].uri).copy(destination);
  await AsyncStorage.setItem(KEY, destination.uri);

  if (previous) discard(previous);

  const url = await upload(destination, userId);

  return { uri: destination.uri, url };
}

export async function clearAvatar(): Promise<void> {
  const uri = await AsyncStorage.getItem(KEY);

  if (uri) discard(uri);

  await AsyncStorage.removeItem(KEY);
}
