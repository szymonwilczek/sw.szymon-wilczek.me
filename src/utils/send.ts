// Shared by /send/ and its Worker (worker/send), so both sides agree on the rules

export const SEND_URL = "https://send.szymon-wilczek.me";

const KIB = 1024;
const MIB = KIB * KIB;
const MB = 1_000_000;
const GB = 1_000_000_000;

export const LIFETIME_SECONDS = 24 * 60 * 60;
export const UNFINISHED_SECONDS = 60 * 60;

export const MAX_TEXT_BYTES = 10 * MB;

export const ROW_BYTES = 2 * MIB;
export const CHUNK_BYTES = 32 * MIB;
export const ROWS_PER_CHUNK = CHUNK_BYTES / ROW_BYTES;
export const SHARD_BYTES = 512 * MIB;
export const CHUNKS_PER_SHARD = SHARD_BYTES / CHUNK_BYTES;
export const POOL_BYTES = 4.5 * GB;

export const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const ID_LENGTH = 5;
export const ID_PATTERN = new RegExp(`^[${ID_ALPHABET}]{${ID_LENGTH}}$`);

export const EXTENSION_PATTERN = /^[a-z0-9]{1,12}$/;
export const TEXT_EXTENSION = "txt";
export const ZIP_EXTENSION = "zip";

export type SendKind = "text" | "file" | "zip";

export interface NewSend {
  word: string;
  kind: SendKind;
  size: number;
  name?: string;
  type?: string;
  extension?: string;
  lock?: string;
}

export interface Started {
  id: string;
  token: string;
  until: string;
}

export const chunkCount = (size: number) => Math.max(1, Math.ceil(size / CHUNK_BYTES));
export const shardCount = (size: number) => Math.max(1, Math.ceil(size / SHARD_BYTES));

// sizes as they read on the page
const UNITS = ["B", "kB", "MB", "GB"];
const STEP = 1000;
export function bytes(size: number): string {
  let value = size;
  let unit = 0;
  while (value >= STEP && unit < UNITS.length - 1) {
    value /= STEP;
    unit++;
  }
  return unit === 0 ? `${value} B` : `${value.toFixed(1)} ${UNITS[unit]}`;
}
