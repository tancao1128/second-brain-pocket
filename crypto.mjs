// Seal and open the snapshot. Same file runs in the browser (Web Crypto) and in Node (global crypto).
// Format: JSON {v, kdf, iter, salt, iv, ct}, all binary fields base64. The key is derived from the passphrase
// with PBKDF2-SHA256 and is never stored; callers keep it in memory only.
export const ITERATIONS = 600000;
const AAD = new TextEncoder().encode('second-brain-pocket/v1');
const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

export async function deriveKey(passphrase, salt, iter = ITERATIONS) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, material,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function seal(plain, passphrase, iter = ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, iter);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, key, new TextEncoder().encode(plain));
  return { v: 1, kdf: 'PBKDF2-SHA256', iter, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}

// Throws on a wrong passphrase or any change to the file (AES-GCM authentication fails).
export async function open(blob, passphrase) {
  if (!blob || blob.v !== 1 || blob.kdf !== 'PBKDF2-SHA256' || !(blob.iter >= ITERATIONS)) throw new Error('bad-format');
  const key = await deriveKey(passphrase, unb64(blob.salt), blob.iter);
  let plain;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.iv), additionalData: AAD }, key, unb64(blob.ct));
  } catch (e) {
    throw new Error('wrong-passphrase');
  }
  return new TextDecoder().decode(plain);
}
