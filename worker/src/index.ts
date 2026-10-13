// My inbox for pieces made in the /roji workshop
//   POST /piece                {key, piece}  from the site only
//   GET  /admin/pending        the waiting pieces, each with an SVG preview
//   POST /admin/:id/approve    the cleaned piece back, to add to pieces.json
//   POST /admin/:id/reject     gone
//   GET  /now                  what the host is listening to (now.ts)
//
// Secrets: KEY_HASH (the line from `npm run roji-key`), ADMIN_TOKEN,
// and for /now the three SPOTIFY_*

import { clean, pieceSvg, MAX_BYTES } from "../../src/utils/tea/pottery";
import { fits } from "../../src/utils/tea/key";
import { FILTERS } from "../../src/utils/tea/ink.js";
import TONES from "./tones.json";
import { now, type NowEnv } from "./now";

interface Env extends NowEnv {
  DB: D1Database;
  KEY_HASH: string;
  ADMIN_TOKEN: string;
  ORIGINS: string; // comma-separated
}

// guest may leave a few pieces an hour
const PER_HOUR = 5;
// the inbox holds so many at once
const MAX_PENDING = 200;

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");
    try {
      if (path === "/piece") return await piece(request, env);
      if (path === "/now") return await now(request, env, context);
      if (path.startsWith("/admin/")) return await admin(request, env, path);
      return text("not here", 404);
    } catch (error) {
      console.error(error);
      return text("something broke", 500);
    }
  },
};

// from the workshop
async function piece(request: Request, env: Env): Promise<Response> {
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

  const body = await request.text();
  if (body.length > MAX_BYTES + 400) return text("too big", 413, cors);
  let sent: { key?: unknown; piece?: unknown };
  try {
    sent = JSON.parse(body);
  } catch {
    return text("not JSON", 400, cors);
  }
  if (typeof sent.key !== "string" || !(await fits(sent.key, env.KEY_HASH)))
    return text("the stone does not move", 403, cors);
  const spec = clean(sent.piece);
  if (!spec) return text("not a piece", 400, cors);
  const json = JSON.stringify(spec);
  if (json.length > MAX_BYTES) return text("too big", 413, cors);

  // who sent it, only as far as counting goes
  const ip = request.headers.get("cf-connecting-ip") || "";
  const who = await sha256(env.KEY_HASH + "/" + ip);
  const hour = new Date(Date.now() - 3_600_000).toISOString();
  const [{ n: recent }] = (
    await env.DB.prepare("SELECT count(*) AS n FROM pieces WHERE who = ? AND at > ?")
      .bind(who, hour)
      .all<{ n: number }>()
  ).results;
  if (recent >= PER_HOUR) return text("slowly: try again in an hour", 429, cors);
  const [{ n: waiting }] = (
    await env.DB.prepare("SELECT count(*) AS n FROM pieces WHERE state = 'pending'").all<{
      n: number;
    }>()
  ).results;
  if (waiting >= MAX_PENDING) return text("the inbox is full", 503, cors);

  await env.DB.prepare("INSERT INTO pieces (at, who, spec) VALUES (?, ?, ?)")
    .bind(new Date().toISOString(), who, json)
    .run();
  return text("kept", 201, cors);
}

// me :)
async function admin(request: Request, env: Env, path: string): Promise<Response> {
  const auth = request.headers.get("authorization") || "";
  if (!env.ADMIN_TOKEN || !(await same(auth, "Bearer " + env.ADMIN_TOKEN))) return text("no", 401);

  if (path === "/admin/pending" && request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, at, spec FROM pieces WHERE state = 'pending' ORDER BY id",
    ).all<{ id: number; at: string; spec: string }>();
    const list = results.flatMap(({ id, at, spec }) => {
      const parsed = clean(JSON.parse(spec));
      return parsed ? [{ id, at, piece: parsed, svg: preview(parsed) }] : [];
    });
    return json(list);
  }

  const match = path.match(/^\/admin\/(\d+)\/(approve|reject)$/);
  if (match && request.method === "POST") {
    const id = Number(match[1]);
    const row = await env.DB.prepare("SELECT spec FROM pieces WHERE id = ? AND state = 'pending'")
      .bind(id)
      .first<{ spec: string }>();
    if (!row) return text("no such piece waiting", 404);
    if (match[2] === "reject") {
      await env.DB.prepare("DELETE FROM pieces WHERE id = ?").bind(id).run();
      return text("gone");
    }
    await env.DB.prepare("UPDATE pieces SET state = 'approved' WHERE id = ?").bind(id).run();
    return json(clean(JSON.parse(row.spec)));
  }
  return text("not here", 404);
}

// whole SVG file of the piece in fixed colours, for librsvg in Emacs
function preview(cleaned: NonNullable<ReturnType<typeof clean>>): string {
  const { W: width, H: height, svg } = pieceSvg(cleaned, 0, 2);
  const flat = resolve(svg);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${TONES.paper}"/><defs>${FILTERS}</defs>${flat}</svg>`;
}

// var(--tk-*) to hex, then each color-mix(in oklab, a, b n%), innermost first
const tones = TONES as Record<string, string>;
function resolve(svg: string): string {
  let resolved = svg.replace(/var\(--tk-(\w+)\)/g, (_, tone) => tones[tone] || "#808080");
  const inner = /color-mix\(in oklab, (#[0-9a-f]{6}), (#[0-9a-f]{6}) (\d+)%\)/g;
  const lightDark = /light-dark\((#[0-9a-f]{6}), (#[0-9a-f]{6})\)/g;
  for (let round = 0; round < 8 && /color-mix|light-dark/.test(resolved); round++)
    resolved = resolved
      .replace(inner, (_, from, into, percent) => mixHex(from, into, Number(percent) / 100))
      .replace(lightDark, (_, light) => light);
  return resolved;
}

const linearize = (channel: number) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
const gammaEncode = (channel: number) =>
  channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
function oklab(hex: string): number[] {
  const [r, g, b] = [1, 3, 5].map((i) => linearize(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function hexOf([L, A, B]: number[]): string {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return (
    "#" +
    rgb
      .map((channel) =>
        Math.round(Math.min(1, Math.max(0, gammaEncode(channel))) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
const mixHex = (from: string, into: string, share: number) => {
  const fromLab = oklab(from),
    intoLab = oklab(into);
  return hexOf(fromLab.map((component, i) => component * (1 - share) + intoLab[i] * share));
};

async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// compare without giving away how much of the token was right
async function same(given: string, expected: string): Promise<boolean> {
  const [givenHash, expectedHash] = await Promise.all([sha256(given), sha256(expected)]);
  let difference = 0;
  for (let i = 0; i < givenHash.length; i++)
    difference |= givenHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  return difference === 0;
}

const text = (body: string, status = 200, headers: Record<string, string> = {}) =>
  new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", ...headers },
  });
const json = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
