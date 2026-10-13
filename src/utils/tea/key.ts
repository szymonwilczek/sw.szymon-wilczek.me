export const KEY_HASH = "58524e6fc3d45e5ab2d242adc1551bfc67792181fec380bf76cbbc8433358ab0";

// the same answer however it is typed
export const normalKey = (phrase: string): string =>
  phrase
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ł/g, "l")
    .replace(/[^\p{L}\p{N}]/gu, "");

export async function keyHash(phrase: string): Promise<string> {
  const bytes = new TextEncoder().encode("roji/" + normalKey(phrase));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function fits(phrase: string, hash = KEY_HASH): Promise<boolean> {
  return hash !== "" && normalKey(phrase) !== "" && (await keyHash(phrase)) === hash;
}
