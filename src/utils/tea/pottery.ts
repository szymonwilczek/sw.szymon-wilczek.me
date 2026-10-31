import {
  hash,
  rng,
  newGroup,
  piece,
  toSvg,
  toneVars,
  setPrecision,
  GLAZE_NAMES,
} from "./ink.js";

// u runs around the body, -1..1 across the front, so a full turn is 4;
// v runs down from the rim, 0..1
export type UV = [number, number];

export interface Stroke {
  pts: UV[];
  w: number; // brush width, 0.5..12
  c: number; // pigment: gosu, iron, bengara, white slip, copper, ochre, enji, sumi, gold
  s?: number; // tip: pointed (left out), flat, dry
}

export interface Glaze {
  c: number; // tenmoku, shino, ame, seiji, ruri, oribe, shu, kaki, namako, kinyo, kiseto, haiyu
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
export const PIGMENT_NAMES = [
  "gosu blue",
  "iron brown",
  "bengara red",
  "white slip",
  "copper green",
  "ochre yellow",
  "enji crimson",
  "sumi black",
  "gold",
];
export const TIP_NAMES = ["pointed", "flat", "dry"];

// ceiling on the JSON
export const MAX_BYTES = 12_000;

const SEALS = "花月雪風山水石竹松梅鳥雲空川林森草木火土金光星虹".split("");
export const sealOf = (name: string): string => SEALS[hash("seal/" + name) % SEALS.length];

const rounded = (value: unknown, min: number, max: number, digits = 2): number => {
  const number = typeof value === "number" && Number.isFinite(value) ? value : min;
  const factor = 10 ** digits;
  return Math.round(Math.min(max, Math.max(min, number)) * factor) / factor;
};
const whole = (value: unknown, count: number): number => {
  const floored = Math.floor(typeof value === "number" && Number.isFinite(value) ? value : 0);
  return Math.min(count - 1, Math.max(0, floored));
};
const list = <T>(value: unknown, max: number, parse: (item: unknown) => T | null): T[] =>
  (Array.isArray(value) ? value.slice(0, max) : [])
    .map(parse)
    .filter((item): item is T => item !== null);
const pair = (
  value: unknown,
  firstRange: [number, number],
  secondRange: [number, number],
): [number, number] | null =>
  Array.isArray(value) && value.length === 2
    ? [rounded(value[0], ...firstRange), rounded(value[1], ...secondRange)]
    : null;

export function clean(value: unknown): PieceSpec | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const name = String(raw.name ?? "")
    .replace(/[\p{C}<>&"]/gu, "")
    .trim()
    .slice(0, 24);
  if (!name) return null;

  const prof = list(raw.prof, 8, (point) => pair(point, [6, 96], [0, 1]));
  if (prof.length < 2) return null;
  prof.sort((lower, upper) => lower[1] - upper[1]);
  prof[0][1] = 0;
  prof[prof.length - 1][1] = 1;

  const rawGlaze = raw.glaze as Record<string, unknown> | null;
  const glaze: Glaze | null =
    rawGlaze && typeof rawGlaze === "object"
      ? {
          c: whole(rawGlaze.c, GLAZE_NAMES.length),
          dip: rounded(rawGlaze.dip, 0.05, 1),
          drips: list(rawGlaze.drips, 6, (drip) =>
            Array.isArray(drip) && drip.length === 3
              ? ([
                  rounded(drip[0], -1, 1),
                  rounded(drip[1], 0, 0.4),
                  rounded(drip[2], 0.02, 0.2),
                ] as Glaze["drips"][0])
              : null,
          ),
        }
      : null;

  const toUV = (point: unknown) => pair(point, [-2, 2], [0, 1]) as UV | null;
  const crack = list(raw.kin, 8, toUV);
  const paint = list(raw.paint, 24, (rawStroke): Stroke | null => {
    const stroke = rawStroke as Record<string, unknown> | null;
    if (!stroke || typeof stroke !== "object") return null;
    const points = list(stroke.pts, 64, toUV);
    const tip = whole(stroke.s, TIP_NAMES.length);
    return points.length > 1
      ? {
          pts: points,
          w: rounded(stroke.w, 0.5, 12, 1),
          c: whole(stroke.c, PIGMENT_NAMES.length),
          ...(tip ? { s: tip } : {}),
        }
      : null;
  });
  const sign = list(raw.sign, 12, (rawLine) => {
    const points = list(rawLine, 48, (point) => pair(point, [0, 1], [0, 1]));
    return points.length > 1 ? points : null;
  });
  const made = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.made)) ? String(raw.made) : "";

  return {
    v: 1,
    name,
    prof,
    H: rounded(raw.H, 6, 100, 1),
    handle: raw.handle === true,
    clay: whole(raw.clay, CLAY_NAMES.length),
    glaze,
    fire: whole(raw.fire, 1e6),
    kin: crack.length > 1 ? crack : null,
    paint,
    sign,
    made,
  };
}

const HANDLE_UNTURNED = 1; // the handle sits on the right edge before the piece is turned

export function turned(spec: PieceSpec, turn = 0) {
  const wrap = (around: number) => ((((around + turn + 2) % 4) + 4) % 4) - 2;
  const runs: Stroke[] = [];
  spec.paint.forEach((stroke) => {
    let run: UV[] = [];
    stroke.pts.forEach(([around, up]) => {
      const wrapped = wrap(around);
      if (wrapped > -1 && wrapped < 1) run.push([wrapped, up]);
      else if (run.length) (runs.push({ ...stroke, pts: run }), (run = []));
    });
    if (run.length > 1) runs.push({ ...stroke, pts: run });
  });
  const front = (points: UV[]) =>
    points.map(([around, up]) => [wrap(around), up] as UV).filter(([u]) => u > -1 && u < 1);
  const crack = spec.kin ? front(spec.kin) : [];
  return {
    ...spec,
    paint: runs.filter((stroke) => stroke.pts.length > 1),
    kin: crack.length > 1 ? crack : null,
    glaze: spec.glaze ? { ...spec.glaze, none: false } : { c: 0, dip: 0, drips: [], none: true },
    handleAround: wrap(HANDLE_UNTURNED),
  };
}

export function pieceSvg(spec: PieceSpec, turn = 0, scale = 1.5) {
  const widest = Math.max(...spec.prof.map(([radius]) => radius));
  const size = scale;
  const width = Math.ceil(widest * 2 * size + (spec.handle ? widest * 0.7 * size : 0) + 24);
  const height = Math.ceil(spec.H * size + widest * 0.6 * size + 6 * size + 24);
  const centerX = 12 + widest * size;
  const baseY = 12 + spec.H * size + widest * 0.3 * size;
  const group = newGroup();
  setPrecision(widest * size < 60 ? 10 : 1);
  piece(
    group,
    rng(hash("piece/" + spec.name + spec.fire)),
    centerX,
    baseY,
    size,
    toneVars(),
    turned(spec, turn),
  );
  setPrecision(1);
  return { W: width, H: height, svg: toSvg({ W: width, H: height, groups: [group], clips: [] }) };
}

// what a piece is, read from its shape
export function kindOf(spec: Pick<PieceSpec, "prof" | "H" | "handle">): string {
  const radii = spec.prof.map(([radius]) => radius);
  const rim = radii[radii.length - 1],
    foot = radii[0],
    widest = Math.max(...radii);
  if (spec.H < 20 || spec.H < rim * 0.4) return "plate";
  if (spec.handle) return spec.H > rim * 2.4 ? "tall mug" : "cup";
  if (spec.H >= 40 && rim < widest * 0.72) return "vase";
  if (spec.H < rim * 1.15 && rim > foot * 1.15) return "bowl";
  if (spec.H > rim * 2) return "yunomi";
  return spec.H < rim * 1.3 ? "teacup" : "cup";
}

// what the card under a piece says
export function pieceWords(spec: PieceSpec): string[] {
  const kind = kindOf(spec);
  return [
    `${kind} · ${CLAY_NAMES[spec.clay]} clay`,
    spec.glaze ? `${GLAZE_NAMES[spec.glaze.c]} glaze` : "unglazed",
    spec.kin ? "cracked in the kiln, mended in gold" : "fired twice in the climbing kiln",
  ];
}
