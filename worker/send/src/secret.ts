// Names, tokens and hashes: everything the Worker draws from crypto

import { ID_ALPHABET, ID_LENGTH } from "../../../src/utils/send";

const BYTE_VALUES = 256;
const FAIR_BYTE_LIMIT = BYTE_VALUES - (BYTE_VALUES % ID_ALPHABET.length);
const TOKEN_BYTES = 32;
const SALT_BYTES = 16;
const HEX = 16;

const hex = (data: Uint8Array) =>
  [...data].map((byte) => byte.toString(HEX).padStart(2, "0")).join("");

export function randomId(): string {
  let id = "";
  while (id.length < ID_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(ID_LENGTH))) {
      if (byte < FAIR_BYTE_LIMIT && id.length < ID_LENGTH)
        id += ID_ALPHABET[byte % ID_ALPHABET.length];
    }
  }
  return id;
}

// carried by every chunk of one upload in place of my word
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)));
export const randomSalt = () => hex(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));

export async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return hex(new Uint8Array(digest));
}

// both sides hashed first, so the comparison takes as long whatever was typed
export async function same(given: string, expected: string): Promise<boolean> {
  const [givenHash, expectedHash] = await Promise.all([sha256(given), sha256(expected)]);
  return equalHashes(givenHash, expectedHash);
}

export function equalHashes(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < given.length; i++) difference |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}
