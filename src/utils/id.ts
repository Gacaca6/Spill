/** Short, collision-resistant ids. Local-only, so no cryptographic guarantee is needed. */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function createId(length = 10): string {
  const globalCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

  if (globalCrypto?.getRandomValues) {
    const bytes = new Uint8Array(length);
    globalCrypto.getRandomValues(bytes);
    let out = '';
    for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
    return out;
  }

  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}
