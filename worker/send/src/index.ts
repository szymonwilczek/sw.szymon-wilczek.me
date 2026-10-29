// Text and files passed between my own devices
//   GET    /free            the room left in the pool, for the page
//   POST   /                {word, kind, size, ...} from /send/ only, with my word;
//                           answers {id, token, until}
//   PUT    /:id/:chunk      one chunk of the bytes, with the upload's token
//   POST   /:id/done        every chunk is in; the link opens from now on
//   DELETE /:id             stop: the upload and all of it goes
//   GET    /:id             the thing itself, for a day;
//                           locked one asks for its password first
//
// Secret: SEND_WORD (the password I type on /send/)

import {
  CHUNK_BYTES,
  CHUNKS_PER_SHARD,
  EXTENSION_PATTERN,
  ID_PATTERN,
  MAX_TEXT_BYTES,
  POOL_BYTES,
  SHARD_BYTES,
  TEXT_EXTENSION,
  ZIP_EXTENSION,
  bytes,
  chunkCount,
  type NewSend,
  type Started,
} from "../../../src/utils/send";
import { Registry, shardOf, type Fresh, type Send } from "./registry";
import { equalHashes, randomSalt, same, sha256 } from "./secret";
import type { Shard } from "./shard";

export { Registry } from "./registry";
export { Shard } from "./shard";

interface Env {
  REGISTRY: DurableObjectNamespace<Registry>;
  SHARDS: DurableObjectNamespace<Shard>;
  WRITES: RateLimit;
  GUESSES: RateLimit;
  SEND_WORD: string;
  ORIGINS: string; // comma-separated
}

const START_BODY_LIMIT = 4096;
const MAX_NAME_LENGTH = 255;
const MAX_LOCK_LENGTH = 256;
const TYPE_PATTERN = /^[\w.+-]+\/[\w.+-]+$/;
const TEXT_TYPE = "text/plain; charset=utf-8";
const ZIP_TYPE = "application/zip";
const OPAQUE_TYPE = "application/octet-stream";
const SHOWN =
  /^(image\/(png|jpeg|gif|webp|avif|bmp)|video\/(mp4|webm|ogg|quicktime)|audio\/(mpeg|mp4|ogg|wav|webm|flac|aac)|application\/pdf|text\/plain)$/;
const SANDBOX =
  "sandbox; default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'";
const RANGE = /^bytes=(\d*)-(\d*)$/;

const registry = (env: Env) => env.REGISTRY.get(env.REGISTRY.idFromName("registry"));

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const [id = "", step, extra] = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
    try {
      if (id === "" && extra === undefined && step === undefined) return await start(request, env);
      if (id === "free" && step === undefined) return await free(request, env);
      if (!ID_PATTERN.test(id) || extra !== undefined) return text("not here", 404);
      if (step === undefined) {
        if (request.method === "GET" || request.method === "HEAD")
          return await open(id, request, env);
        return await guarded(request, env, "DELETE", (cors) => stop(id, request, env, cors));
      }
      if (step === "done")
        return await guarded(request, env, "POST", (cors) => done(id, request, env, cors));
      if (/^\d+$/.test(step))
        return await guarded(request, env, "PUT", (cors) =>
          chunk(id, Number(step), request, env, cors),
        );
      return text("not here", 404);
    } catch (error) {
      console.error(error);
      return text("something broke", 500);
    }
  },
};

// the API answers the garden only
async function guarded(
  request: Request,
  env: Env,
  method: string,
  handle: (cors: Record<string, string>) => Promise<Response>,
): Promise<Response> {
  const origin = request.headers.get("origin") || "";
  const allowed = env.ORIGINS.split(",").map((entry) => entry.trim());
  if (!allowed.includes(origin)) return text("not from the garden", 403);
  const cors = {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, PUT, DELETE",
    "access-control-allow-headers": "content-type, x-send-token",
    "access-control-max-age": "86400",
    vary: "origin",
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== method) return text(`${method} only`, 405, cors);
  return handle(cors);
}

const free = (request: Request, env: Env) =>
  guarded(request, env, "GET", async (cors) =>
    json({ free: await registry(env).free(), pool: POOL_BYTES }, cors),
  );

async function start(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET")
    return text("nothing to read here; send at szymon-wilczek.me/send/");
  return guarded(request, env, "POST", async (cors) => {
    const ip = request.headers.get("cf-connecting-ip") || "";
    if (!(await env.WRITES.limit({ key: ip })).success) return text("slow down", 429, cors);

    const body = await request.text();
    if (body.length > START_BODY_LIMIT) return text("too big", 413, cors);
    let sent: Partial<NewSend>;
    try {
      sent = JSON.parse(body);
    } catch {
      return text("not JSON", 400, cors);
    }

    if (!env.SEND_WORD) return text("the password is not set", 503, cors);
    if (typeof sent.word !== "string" || !(await same(sent.word, env.SEND_WORD)))
      return text("the password does not fit", 403, cors);

    const fresh = await described(sent);
    if (typeof fresh === "string") return text(fresh, 400, cors);
    const started = await registry(env).start(fresh);
    if ("free" in started)
      return text(`no room: ${bytes(fresh.size)} asked, ${bytes(started.free)} free`, 507, cors);
    if ("busy" in started) return text("no free name, try again", 503, cors);
    const { id, token, expires } = started.send;
    const answer: Started = { id, token, until: new Date(expires).toISOString() };
    return json(answer, cors);
  });
}

// what the page announced, checked; a string is what was wrong with it
async function described(sent: Partial<NewSend>): Promise<Fresh | string> {
  const { kind, size } = sent;
  if (kind !== "text" && kind !== "file" && kind !== "zip") return "no such kind";
  if (typeof size !== "number" || !Number.isSafeInteger(size) || size < 1) return "nothing to send";
  if (size > POOL_BYTES) return "bigger than the whole pool";
  if (kind === "text" && size > MAX_TEXT_BYTES) return "too much text";

  let extension: string | null = null;
  if (kind === "text" && sent.extension) {
    extension = String(sent.extension).replace(/^\.+/, "").toLowerCase();
    if (!EXTENSION_PATTERN.test(extension)) return "not an extension";
  }
  let name: string | null = null;
  let type: string | null = null;
  if (kind === "file") {
    name = String(sent.name ?? "")
      .replace(/[\u0000-\u001f\u007f/\\]/g, "_")
      .slice(0, MAX_NAME_LENGTH);
    if (!name.trim()) return "a file needs a name";
    type = TYPE_PATTERN.test(String(sent.type)) ? String(sent.type).toLowerCase() : OPAQUE_TYPE;
  }

  let lock_salt: string | null = null;
  let lock_hash: string | null = null;
  if (sent.lock !== undefined && sent.lock !== "") {
    if (typeof sent.lock !== "string" || sent.lock.length > MAX_LOCK_LENGTH)
      return "not a password";
    lock_salt = randomSalt();
    lock_hash = await sha256(lock_salt + sent.lock);
  }
  return { kind, size, name, type, extension, lock_salt, lock_hash };
}

async function chunk(
  id: string,
  index: number,
  request: Request,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  const send = await registry(env).uploading(id, request.headers.get("x-send-token") || "");
  if (!send) return text("no such upload", 404, cors);
  const count = chunkCount(send.size);
  if (index >= count) return text("past the end", 400, cors);
  if (!request.body) return text("an empty chunk", 400, cors);
  const expected = index < count - 1 ? CHUNK_BYTES : send.size - index * CHUNK_BYTES;
  const shard = shardOf(env, id, Math.floor(index / CHUNKS_PER_SHARD));
  let got: number;
  try {
    got = await shard.write(index, request.body, send.expires);
  } catch {
    return text("chunk too big", 413, cors);
  }
  if (got !== expected) return text(`chunk ${index} is ${got} bytes, not ${expected}`, 400, cors);
  return new Response(null, { status: 204, headers: cors });
}

async function done(id: string, request: Request, env: Env, cors: Record<string, string>) {
  const finished = await registry(env).finish(id, request.headers.get("x-send-token") || "");
  if (!finished) return text("no such upload", 404, cors);
  if ("missing" in finished) return text(`${bytes(finished.missing)} still missing`, 409, cors);
  return json({ id, until: new Date(finished.send.expires).toISOString() }, cors);
}

async function stop(id: string, request: Request, env: Env, cors: Record<string, string>) {
  const dropped = await registry(env).drop(id, request.headers.get("x-send-token") || "");
  if (!dropped) return text("no such upload", 404, cors);
  return new Response(null, { status: 204, headers: cors });
}

// how a send meets the other screen: its name, its type, shown or downloaded
function shape(send: Send): { name: string; type: string; shown: boolean } {
  if (send.kind === "zip")
    return { name: `${send.id}.${ZIP_EXTENSION}`, type: ZIP_TYPE, shown: false };
  if (send.kind === "text")
    return send.extension
      ? { name: `${send.id}.${send.extension}`, type: TEXT_TYPE, shown: false }
      : { name: `${send.id}.${TEXT_EXTENSION}`, type: TEXT_TYPE, shown: true };
  const type = send.type || OPAQUE_TYPE;
  const shown = SHOWN.test(type);
  return { name: send.name || send.id, type: type === "text/plain" ? TEXT_TYPE : type, shown };
}

async function open(id: string, request: Request, env: Env): Promise<Response> {
  const send = await registry(env).opened(id);
  if (!send) return text("gone, or never was", 404);

  if (send.lock_salt && send.lock_hash) {
    const given = password(request.headers.get("authorization"));
    const fits =
      given !== null && equalHashes(await sha256(send.lock_salt + given), send.lock_hash);
    if (!fits) {
      if (given !== null) {
        const ip = request.headers.get("cf-connecting-ip") || "";
        if (!(await env.GUESSES.limit({ key: ip })).success) return text("slow down", 429);
      }
      return text("locked", 401, {
        "www-authenticate": `Basic realm="send ${id}", charset="UTF-8"`,
      });
    }
  }

  const { name, type, shown } = shape(send);
  const headers: Record<string, string> = {
    "content-type": type,
    "content-disposition": `${shown ? "inline" : "attachment"}; ${filename(name)}`,
    "accept-ranges": "bytes",
    "cache-control": "private, no-store",
    "x-robots-tag": "noindex",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  };
  if (type !== "application/pdf") headers["content-security-policy"] = SANDBOX;

  const range = wanted(request.headers.get("range"), send.size);
  if (range === "unsatisfiable")
    return text("out of range", 416, { "content-range": `bytes */${send.size}` });
  const [first, end] = range ?? [0, send.size];
  headers["content-length"] = String(end - first);
  if (range) headers["content-range"] = `bytes ${first}-${end - 1}/${send.size}`;
  const status = range ? 206 : 200;
  if (request.method === "HEAD") return new Response(null, { status, headers });
  return new Response(stream(env, id, first, end), { status, headers });
}

// the password from a Basic prompt; the name typed beside it doesn't matter
function password(authorization: string | null): string | null {
  const [scheme, encoded] = (authorization || "").split(" ");
  if (scheme?.toLowerCase() !== "basic" || !encoded) return null;
  try {
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)),
    );
    const colon = decoded.indexOf(":");
    return colon < 0 ? null : decoded.slice(colon + 1);
  } catch {
    return null;
  }
}

function filename(name: string): string {
  const plain = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `filename="${plain}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

// one range, as a video player asks for it: [first, end), or null for all of it
function wanted(header: string | null, size: number): [number, number] | null | "unsatisfiable" {
  const match = header ? RANGE.exec(header.trim()) : null;
  if (!match || (match[1] === "" && match[2] === "")) return null;
  if (match[1] === "") {
    const tail = Math.min(Number(match[2]), size);
    return tail === 0 ? "unsatisfiable" : [size - tail, size];
  }
  const first = Number(match[1]);
  if (first >= size) return "unsatisfiable";
  const last = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  return last < first ? "unsatisfiable" : [first, last + 1];
}

// shard after shard, each one's piece of [first, end) in turn
function stream(env: Env, id: string, first: number, end: number): ReadableStream<Uint8Array> {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  (async () => {
    for (let index = Math.floor(first / SHARD_BYTES); index * SHARD_BYTES < end; index++) {
      const from = Math.max(first, index * SHARD_BYTES);
      const to = Math.min(end, (index + 1) * SHARD_BYTES);
      const piece = await shardOf(env, id, index).read(from, to);
      await piece.pipeTo(writable, { preventClose: true });
    }
    await writable.close();
  })().catch((error) => writable.abort(error).catch(() => {}));
  return readable;
}

const RAW_HEADERS = {
  "content-type": TEXT_TYPE,
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
