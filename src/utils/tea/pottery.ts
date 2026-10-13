import {
  hash,
  rng,
  newGroup,
  piece,
  toSvg,
  toneVars,
  setPrecision,
  PROFILES,
  GLAZE_NAMES,
} from "./ink.js";

// u runs around the body, -1..1 across the front, so a full turn is 4;
// v runs down from the rim, 0..1
export type UV = [number, number];

export interface Stroke {
  pts: UV[];
  w: number; // brush width, 1..8
  c: number; // pigment: gosu, iron, bengara, white slip
}

export interface Glaze {
  c: number; // tenmoku, shino, ame, seiji, ruri, oribe, shu
  dip: number; // how far down from the rim it went, 0..1
  drips: [u: number, len: number, w: number][];
}

export interface PieceSpec {
  v: 1;
  name: string;
  prof: [r: number, y: number][]; // from the foot (y 0) to the rim (y 1), radius in units
  H: number;
  handle: boolean;
  clay: number; // buff, red, dark, white
  glaze: Glaze | null;
  fire: number; // the seed for what the kiln did
  kin: UV[] | null; // crack mended in gold
  paint: Stroke[];
  sign: [number, number][][]; // the name written by hand, in a 0..1 box
  made: string; // YYYY-MM-DD
}

export const CLAY_NAMES = ["buff", "red", "dark", "white"];
export const PIGMENT_NAMES = ["gosu blue", "iron brown", "bengara red", "white slip"];
export { GLAZE_NAMES, PROFILES as PROF };

// ceiling on the JSON
export const MAX_BYTES = 12_000;

const SEALS = "花月雪風山水石竹松梅鳥雲空川林森草木火土金光星虹".split("");
export const sealOf = (name: string): string => SEALS[hash("seal/" + name) % SEALS.length];

const num = (x: unknown, lo: number, hi: number, d = 2): number => {
  const n = typeof x === "number" && Number.isFinite(x) ? x : lo;
  const k = 10 ** d;
  return Math.round(Math.min(hi, Math.max(lo, n)) * k) / k;
};
const int = (x: unknown, n: number): number => {
  const v = Math.floor(typeof x === "number" && Number.isFinite(x) ? x : 0);
  return Math.min(n - 1, Math.max(0, v));
};
const list = <T>(x: unknown, max: number, f: (y: unknown) => T | null): T[] =>
  (Array.isArray(x) ? x.slice(0, max) : []).map(f).filter((y): y is T => y !== null);
const pair = (x: unknown, a: [number, number], b: [number, number]): [number, number] | null =>
  Array.isArray(x) && x.length === 2 ? [num(x[0], ...a), num(x[1], ...b)] : null;

export function clean(x: unknown): PieceSpec | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const name = String(o.name ?? "")
    .replace(/[\p{C}<>&"]/gu, "")
    .trim()
    .slice(0, 24);
  if (!name) return null;

  const prof = list(o.prof, 8, (p) => pair(p, [6, 96], [0, 1]));
  if (prof.length < 2) return null;
  prof.sort((a, b) => a[1] - b[1]);
  prof[0][1] = 0;
  prof[prof.length - 1][1] = 1;

  const g = o.glaze as Record<string, unknown> | null;
  const glaze: Glaze | null =
    g && typeof g === "object"
      ? {
          c: int(g.c, GLAZE_NAMES.length),
          dip: num(g.dip, 0.05, 1),
          drips: list(g.drips, 6, (d) =>
            Array.isArray(d) && d.length === 3
              ? ([num(d[0], -1, 1), num(d[1], 0, 0.4), num(d[2], 0.02, 0.2)] as Glaze["drips"][0])
              : null,
          ),
        }
      : null;

  const uv = (p: unknown) => pair(p, [-2, 2], [0, 1]) as UV | null;
  const kin = list(o.kin, 8, uv);
  const paint = list(o.paint, 24, (s): Stroke | null => {
    const st = s as Record<string, unknown> | null;
    if (!st || typeof st !== "object") return null;
    const pts = list(st.pts, 64, uv);
    return pts.length > 1
      ? { pts, w: num(st.w, 1, 8, 1), c: int(st.c, PIGMENT_NAMES.length) }
      : null;
  });
  const sign = list(o.sign, 12, (s) => {
    const pts = list(s, 48, (p) => pair(p, [0, 1], [0, 1]));
    return pts.length > 1 ? pts : null;
  });
  const made = /^\d{4}-\d{2}-\d{2}$/.test(String(o.made)) ? String(o.made) : "";

  return {
    v: 1,
    name,
    prof,
    H: num(o.H, 6, 100, 1),
    handle: o.handle === true,
    clay: int(o.clay, CLAY_NAMES.length),
    glaze,
    fire: int(o.fire, 1e6),
    kin: kin.length > 1 ? kin : null,
    paint,
    sign,
    made,
  };
}

export function turned(spec: PieceSpec, turn = 0) {
  const wrap = (u: number) => ((((u + turn + 2) % 4) + 4) % 4) - 2;
  const runs: Stroke[] = [];
  spec.paint.forEach((st) => {
    let cur: UV[] = [];
    st.pts.forEach(([u, v]) => {
      const w = wrap(u);
      if (w > -1 && w < 1) cur.push([w, v]);
      else if (cur.length) (runs.push({ ...st, pts: cur }), (cur = []));
    });
    if (cur.length > 1) runs.push({ ...st, pts: cur });
  });
  const front = (pts: UV[]) =>
    pts.map(([u, v]) => [wrap(u), v] as UV).filter(([u]) => u > -1 && u < 1);
  const kin = spec.kin ? front(spec.kin) : [];
  return {
    ...spec,
    paint: runs.filter((s) => s.pts.length > 1),
    kin: kin.length > 1 ? kin : null,
    glaze: spec.glaze ? { ...spec.glaze, none: false } : { c: 0, dip: 0, drips: [], none: true },
    seal: true,
  };
}

export function pieceSvg(spec: PieceSpec, turn = 0, scale = 1.5) {
  const rw = Math.max(...spec.prof.map(([r]) => r));
  const s = scale;
  const W = Math.ceil(rw * 2 * s + (spec.handle ? rw * 0.7 * s : 0) + 24);
  const H = Math.ceil(spec.H * s + rw * 0.6 * s + 6 * s + 24);
  const cx = 12 + rw * s;
  const cy = 12 + spec.H * s + rw * 0.3 * s;
  const g = newGroup();
  setPrecision(rw * s < 60 ? 10 : 1);
  piece(g, rng(hash("piece/" + spec.name + spec.fire)), cx, cy, s, toneVars(), turned(spec, turn));
  setPrecision(1);
  return { W, H, svg: toSvg({ W, H, groups: [g], clips: [] }) };
}

// what the card under a piece says
export function pieceWords(spec: PieceSpec): string[] {
  const kind = spec.H < 20 ? "plate" : spec.handle ? "cup" : spec.H < 50 ? "bowl" : "yunomi";
  return [
    `${kind} · ${CLAY_NAMES[spec.clay]} clay`,
    spec.glaze ? `${GLAZE_NAMES[spec.glaze.c]} glaze` : "unglazed",
    spec.kin ? "cracked in the kiln, mended in gold" : "fired twice in the climbing kiln",
  ];
}
