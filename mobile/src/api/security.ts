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
 * rather than AsyncStorage. Against an attacker with the file that hash is weak
 * — a four-digit space is exhausted instantly — but it does mean the PIN cannot
 * be read straight out of storage, and the keychain is what keeps the file away
 * from other apps in the first place.
 */

const KEY = 'pylearn.pin.v1';

export const PIN_LENGTH = 4;

type StoredPin = { salt: string; hash: string };

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fingerprint(pin: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

function read(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export function isPinFormat(pin: string) {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export async function hasPin(): Promise<boolean> {
  try {
    return (await read()) !== null;
  } catch {
    // an unreadable keychain must not lock the learner out of their own app
    return false;
  }
}

export async function setPin(pin: string): Promise<void> {
  if (!isPinFormat(pin)) {
    throw new Error(`The PIN has to be ${PIN_LENGTH} digits.`);
  }

  const salt = toHex(Crypto.getRandomBytes(16));
  const record: StoredPin = { salt, hash: await fingerprint(pin, salt) };

  await SecureStore.setItemAsync(KEY, JSON.stringify(record));
}

export async function verifyPin(pin: string): Promise<boolean> {
  const raw = await read();

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

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
