import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * The app-open PIN.
 *
 * Be clear about what this is: a lock on this device, not on the account. Four
 * digits is 10,000 combinations, so anyone holding an unlocked phone and enough
 * patience gets through, and the PIN travels nowhere — signing in on another
 * device is guarded by the Supabase password, not by this. What it does buy is
 * the ordinary thing a PIN buys: someone glancing at a handed-over phone cannot
 * open the app.
 *
 * The digits themselves are never written down. A random salt is generated per
 * PIN and only the SHA-256 of `salt:pin` is stored, inside the system keychain
 * rather than AsyncStorage.
 *
 * One entry per account, not one per phone. A single shared slot forced an
 * unpleasant choice at sign-out: keep it, and the next person to sign in is
 * locked out by a code they never chose; clear it, and coming back to your own
 * account means setting the same PIN again. Keying by user id removes the
 * choice — each account carries its own, and signing out touches neither.
 */

const PREFIX = 'pylearn.pin.v2.';
/** the single slot everything used before; adopted once, then removed */
const LEGACY_KEY = 'pylearn.pin.v1';

export const PIN_LENGTH = 4;

type StoredPin = { salt: string; hash: string };

function keyFor(userId: string) {
  return `${PREFIX}${userId}`;
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fingerprint(pin: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

/**
 * Reads this account's entry, adopting the old shared one the first time.
 *
 * Whoever is signed in when the app updates is the person whose PIN that was,
 * so handing it to them is right — and it saves them setting the same four
 * digits again for no reason they could see.
 */
async function read(userId: string): Promise<string | null> {
  const own = await SecureStore.getItemAsync(keyFor(userId));

  if (own) return own;

  const legacy = await SecureStore.getItemAsync(LEGACY_KEY);

  if (!legacy) return null;

  await SecureStore.setItemAsync(keyFor(userId), legacy);
  await SecureStore.deleteItemAsync(LEGACY_KEY);

  return legacy;
}

export function isPinFormat(pin: string) {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export async function hasPin(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    return (await read(userId)) !== null;
  } catch {
    // an unreadable keychain must not lock the learner out of their own app
    return false;
  }
}

export async function setPin(userId: string, pin: string): Promise<void> {
  if (!isPinFormat(pin)) {
    throw new Error(`The PIN has to be ${PIN_LENGTH} digits.`);
  }

  const salt = toHex(Crypto.getRandomBytes(16));
  const record: StoredPin = { salt, hash: await fingerprint(pin, salt) };

  await SecureStore.setItemAsync(keyFor(userId), JSON.stringify(record));
}

export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const raw = await read(userId);

  if (!raw) {
    return false;
  }

  try {
    const record = JSON.parse(raw) as StoredPin;

    return (await fingerprint(pin, record.salt)) === record.hash;
  } catch {
    return false;
  }
}

/** Used when an account is deleted; signing out deliberately leaves it alone. */
export async function clearPin(userId: string): Promise<void> {
  if (!userId) return;

  await SecureStore.deleteItemAsync(keyFor(userId));
}
