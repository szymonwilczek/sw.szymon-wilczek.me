export const KEY_HASH = "";

// the same answer however it is typed
export const normalKey = (s: string): string =>
  s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ł/g, "l")
    .replace(/[^\p{L}\p{N}]/gu, "");

export async function keyHash(s: string): Promise<string> {
  const bytes = new TextEncoder().encode("roji/" + normalKey(s));
  const sum = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(sum)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function fits(s: string, hash = KEY_HASH): Promise<boolean> {
  return hash !== "" && normalKey(s) !== "" && (await keyHash(s)) === hash;
}
