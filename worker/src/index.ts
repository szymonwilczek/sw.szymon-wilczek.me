// My inbox for pieces made in the /roji workshop
//   POST /piece                {key, piece}  from the site only
//   GET  /admin/pending        the waiting pieces, each with an SVG preview
//   POST /admin/:id/approve    the cleaned piece back, to add to pieces.json
//   POST /admin/:id/reject     gone
//
// Secrets: KEY_HASH (the line from `npm run roji-key`), ADMIN_TOKEN

import { clean, pieceSvg, MAX_BYTES } from "../../src/utils/tea/pottery";
import { fits } from "../../src/utils/tea/key";
import { FILTERS } from "../../src/utils/tea/ink.js";
import TONES from "./tones.json";

interface Env {
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
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "");
    try {
      if (path === "/piece") return await piece(req, env);
      if (path.startsWith("/admin/")) return await admin(req, env, path);
      return text("not here", 404);
    } catch (e) {
      console.error(e);
      return text("something broke", 500);
    }
  },
};

// from the workshop
async function piece(req: Request, env: Env): Promise<Response> {
  const origin = req.headers.get("origin") || "";
  const allowed = env.ORIGINS.split(",").map((s) => s.trim());
  if (!allowed.includes(origin)) return text("not from the garden", 403);
  const cors = {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return text("POST only", 405, cors);

  const body = await req.text();
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
  const ip = req.headers.get("cf-connecting-ip") || "";
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
async function admin(req: Request, env: Env, path: string): Promise<Response> {
  const auth = req.headers.get("authorization") || "";
  if (!env.ADMIN_TOKEN || !(await same(auth, "Bearer " + env.ADMIN_TOKEN))) return text("no", 401);

  if (path === "/admin/pending" && req.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, at, spec FROM pieces WHERE state = 'pending' ORDER BY id",
    ).all<{ id: number; at: string; spec: string }>();
    const list = results.flatMap(({ id, at, spec }) => {
      const p = clean(JSON.parse(spec));
      return p ? [{ id, at, piece: p, svg: preview(p) }] : [];
    });
    return json(list);
  }

  const m = path.match(/^\/admin\/(\d+)\/(approve|reject)$/);
  if (m && req.method === "POST") {
    const id = Number(m[1]);
    const row = await env.DB.prepare("SELECT spec FROM pieces WHERE id = ? AND state = 'pending'")
      .bind(id)
      .first<{ spec: string }>();
    if (!row) return text("no such piece waiting", 404);
    if (m[2] === "reject") {
      await env.DB.prepare("DELETE FROM pieces WHERE id = ?").bind(id).run();
      return text("gone");
    }
    await env.DB.prepare("UPDATE pieces SET state = 'approved' WHERE id = ?").bind(id).run();
    return json(clean(JSON.parse(row.spec)));
  }
  return text("not here", 404);
}

// whole SVG file of the piece in fixed colours, for librsvg in Emacs
function preview(p: NonNullable<ReturnType<typeof clean>>): string {
  const { W, H, svg } = pieceSvg(p, 0, 2);
  const flat = resolve(svg);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${TONES.paper}"/><defs>${FILTERS}</defs>${flat}</svg>`;
}

// var(--tk-*) to hex, then each color-mix(in oklab, a, b n%), innermost first
const tones = TONES as Record<string, string>;
function resolve(svg: string): string {
  let s = svg.replace(/var\(--tk-(\w+)\)/g, (_, n) => tones[n] || "#808080");
  const inner = /color-mix\(in oklab, (#[0-9a-f]{6}), (#[0-9a-f]{6}) (\d+)%\)/g;
  const lightDark = /light-dark\((#[0-9a-f]{6}), (#[0-9a-f]{6})\)/g;
  for (let k = 0; k < 8 && /color-mix|light-dark/.test(s); k++)
    s = s
      .replace(inner, (_, a, b, t) => mixHex(a, b, Number(t) / 100))
      .replace(lightDark, (_, a) => a);
  return s;
}

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function oklab(hex: string): number[] {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
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
      .map((c) =>
        Math.round(Math.min(1, Math.max(0, gam(c))) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
const mixHex = (a: string, b: string, t: number) => {
  const x = oklab(a),
    y = oklab(b);
  return hexOf(x.map((v, i) => v * (1 - t) + y[i] * t));
};

async function sha256(s: string): Promise<string> {
  const sum = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(sum)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// compare without giving away how much of the token was right
async function same(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}

const text = (s: string, status = 200, headers: Record<string, string> = {}) =>
  new Response(s, { status, headers: { "content-type": "text/plain; charset=utf-8", ...headers } });
const json = (x: unknown) =>
  new Response(JSON.stringify(x), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
