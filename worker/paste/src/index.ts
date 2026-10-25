// Text passed between my own devices
//   POST /        {word, text}  from /paste/ only, with my word; answers {id, until}
//   GET  /:id     the text itself, raw, for a day
//
// Secret: PASTE_WORD (the word I type on /paste/)

import {
  ID_ALPHABET,
  ID_LENGTH,
  ID_PATTERN,
  LIFETIME_SECONDS,
  MAX_CHARS,
} from "../../../src/utils/paste";

interface Env {
  PASTES: KVNamespace;
  WRITES: RateLimit;
  PASTE_WORD: string;
  ORIGINS: string; // comma-separated
}

const ID_ATTEMPTS = 8;
const BODY_SLACK = 1024;
const FAIR_BYTE_LIMIT = 256 - (256 % ID_ALPHABET.length);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
    try {
      if (path === "") return await write(request, env);
      if (ID_PATTERN.test(path) && request.method === "GET") return await read(path, env);
      return text("not here", 404);
    } catch (error) {
      console.error(error);
      return text("something broke", 500);
    }
  },
};

async function read(id: string, env: Env): Promise<Response> {
  const paste = await env.PASTES.get(id);
  if (paste === null) return text("gone, or never was", 404);
  return text(paste);
}

async function write(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET")
    return text("nothing to read here; write at szymon-wilczek.me/paste/");

  const origin = request.headers.get("origin") || "";
  const allowed = env.ORIGINS.split(",").map((entry) => entry.trim());
  if (!allowed.includes(origin)) return text("not from the garden", 403);
  const cors = {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return text("POST only", 405, cors);

  const ip = request.headers.get("cf-connecting-ip") || "";
  if (!(await env.WRITES.limit({ key: ip })).success) return text("slow down", 429, cors);

  const body = await request.text();
  if (body.length > MAX_CHARS * 2 + BODY_SLACK) return text("too big", 413, cors);
  let sent: { word?: unknown; text?: unknown };
  try {
    sent = JSON.parse(body);
  } catch {
    return text("not JSON", 400, cors);
  }

  if (!env.PASTE_WORD) return text("the word is not set", 503, cors);
  if (typeof sent.word !== "string" || !(await same(sent.word, env.PASTE_WORD)))
    return text("the word does not fit", 403, cors);
  if (typeof sent.text !== "string" || !sent.text.trim()) return text("nothing to send", 400, cors);
  if (sent.text.length > MAX_CHARS) return text("too big", 413, cors);

  const id = await freeId(env);
  if (!id) return text("no free name, try again", 503, cors);
  await env.PASTES.put(id, sent.text, { expirationTtl: LIFETIME_SECONDS });
  const until = new Date(Date.now() + LIFETIME_SECONDS * 1000).toISOString();
  return json({ id, until }, cors);
}

async function freeId(env: Env): Promise<string | null> {
  for (let attempt = 0; attempt < ID_ATTEMPTS; attempt++) {
    const id = randomId();
    if ((await env.PASTES.get(id)) === null) return id;
  }
  return null;
}

function randomId(): string {
  let id = "";
  while (id.length < ID_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(ID_LENGTH))) {
      if (byte < FAIR_BYTE_LIMIT && id.length < ID_LENGTH)
        id += ID_ALPHABET[byte % ID_ALPHABET.length];
    }
  }
  return id;
}

async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function same(given: string, expected: string): Promise<boolean> {
  const [givenHash, expectedHash] = await Promise.all([sha256(given), sha256(expected)]);
  let difference = 0;
  for (let i = 0; i < givenHash.length; i++)
    difference |= givenHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  return difference === 0;
}

const RAW_HEADERS = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "no-store",
  "x-robots-tag": "noindex",
  "x-content-type-options": "nosniff",
};

const text = (body: string, status = 200, headers: Record<string, string> = {}) =>
  new Response(body, { status, headers: { ...RAW_HEADERS, ...headers } });
const json = (value: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(value), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
