const ROUND_CONSTANTS = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const INITIAL_STATE = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];
const BLOCK_BYTES = 64;
const WORD_BYTES = 4;
const BLOCK_WORDS = BLOCK_BYTES / WORD_BYTES;
const LENGTH_BYTES = 8;
const DIGEST_BYTES = 32;
const SCHEDULE_WORDS = 64;
const END_MARKER = 0x80;

const rotateRight = (word: number, bits: number) => (word >>> bits) | (word << (32 - bits));

export function sha256(message: Uint8Array): Uint8Array {
  const paddedLength = Math.ceil((message.length + 1 + LENGTH_BYTES) / BLOCK_BYTES) * BLOCK_BYTES;
  const padded = new Uint8Array(paddedLength);
  padded.set(message);
  padded[message.length] = END_MARKER;
  const view = new DataView(padded.buffer);
  const bitLength = message.length * 8;
  view.setUint32(paddedLength - LENGTH_BYTES, Math.floor(bitLength / 2 ** 32));
  view.setUint32(paddedLength - WORD_BYTES, bitLength >>> 0);

  const state = [...INITIAL_STATE];
  const schedule = new Uint32Array(SCHEDULE_WORDS);
  for (let block = 0; block < paddedLength; block += BLOCK_BYTES) {
    for (let i = 0; i < BLOCK_WORDS; i++) schedule[i] = view.getUint32(block + i * WORD_BYTES);
    for (let i = BLOCK_WORDS; i < SCHEDULE_WORDS; i++) {
      const before = schedule[i - 15];
      const recent = schedule[i - 2];
      const sigma0 = rotateRight(before, 7) ^ rotateRight(before, 18) ^ (before >>> 3);
      const sigma1 = rotateRight(recent, 17) ^ rotateRight(recent, 19) ^ (recent >>> 10);
      schedule[i] = schedule[i - 16] + sigma0 + schedule[i - 7] + sigma1;
    }

    let [a, b, c, d, e, f, g, h] = state;
    for (let i = 0; i < SCHEDULE_WORDS; i++) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + sum1 + choice + ROUND_CONSTANTS[i] + schedule[i]) | 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) | 0;
      [h, g, f, e, d, c, b, a] = [g, f, e, (d + temp1) | 0, c, b, a, (temp1 + temp2) | 0];
    }
    [a, b, c, d, e, f, g, h].forEach((word, i) => (state[i] = (state[i] + word) | 0));
  }

  const digest = new Uint8Array(DIGEST_BYTES);
  const out = new DataView(digest.buffer);
  state.forEach((word, i) => out.setUint32(i * WORD_BYTES, word >>> 0));
  return digest;
}
