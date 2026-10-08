// Woodblock postage stamps for photo albums.
// The same slug always yields the same stamp.

export interface StampInput {
  slug: string;
  terrain: string[];
}

export type StampLayer = "sun" | "far" | "near" | "sea" | "sand" | "motif";

export interface Stamp {
  seed: number;
  seaY: number;
  layers: Array<{ kind: StampLayer; d: string }>;
  waves: string;
}

// FNV-1a, then mulberry32: deterministic randomness per album
export function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = (n: number) => Math.round(n * 10) / 10;

type Point = [number, number];

// Catmull-Rom through the points, written as cubic Beziers
function smooth(pts: Point[], closed: boolean): string {
  const p = closed
    ? [pts[pts.length - 1], ...pts, pts[0], pts[1]]
    : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${f1(p[1][0])} ${f1(p[1][1])}`;
  for (let i = 1; i < p.length - 2; i++) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const [x2, y2] = p[i + 1];
    const [x3, y3] = p[i + 2];
    d +=
      ` C${f1(x1 + (x2 - x0) / 6)} ${f1(y1 + (y2 - y0) / 6)}` +
      ` ${f1(x2 - (x3 - x1) / 6)} ${f1(y2 - (y3 - y1) / 6)} ${f1(x2)} ${f1(y2)}`;
  }
  return closed ? d + " Z" : d;
}

// midpoint-displacement ridge across the art window,
// closed to the bottom
function ridge(
  r: () => number,
  base: number,
  amp: number,
  rough: number,
  peakAt: number | null,
  bottom: number,
): string {
  let pts: Point[] = [
    [4, base],
    [96, base],
  ];
  for (let lvl = 0; lvl < 4; lvl++) {
    const next: Point[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      next.push(pts[i], [(x0 + x1) / 2, (y0 + y1) / 2 + (r() - 0.5) * amp * Math.pow(rough, lvl)]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  if (peakAt !== null) {
    pts = pts.map(([x, y]) => [x, y - amp * 0.9 * Math.exp(-Math.pow((x - peakAt) / 16, 2))]);
  }
  return smooth(pts, false) + ` L96 ${bottom} L4 ${bottom} Z`;
}

function wall(r: () => number, side: "left" | "right", inner: number, bottom: number): string {
  const pts: Point[] = [];
  for (let y = 4; y <= bottom; y += 9) pts.push([inner + (r() - 0.5) * 9, y]);
  const edge = side === "left" ? 4 : 96;
  return smooth(pts, false) + ` L${edge} ${bottom} L${edge} 4 Z`;
}

// overlapping arcs standing in for water
function seigaiha(y0: number, y1: number): string {
  let d = "";
  let row = 0;
  for (let y = y0 + 4; y < y1 + 6; y += 4, row++) {
    for (let x = (row % 2) * 4; x < 100; x += 8) {
      d += `M${x - 4} ${y} a4 4 0 0 1 8 0 M${x - 2.6} ${y} a2.6 2.6 0 0 1 5.2 0 `;
    }
  }
  return d;
}

const MOTIFS: Record<string, string> = {
  boat: "M58 66 L68 66 L66 69 L60 69 Z M63 66 L63 57 L68 65",
  palm: "M34 74 C33 62 31 50 36 38 M36 38 C30 34 23 36 19 42 M36 38 C42 32 50 34 53 40 M36 38 C34 31 28 28 24 28 M36 38 C40 30 46 27 50 29 M36 38 C32 40 28 46 27 51 M36 38 C41 41 44 46 44 51",
  birds: "M60 24 q2 -2 4 0 q2 -2 4 0 M70 30 q1.5 -1.5 3 0 q1.5 -1.5 3 0",
  walkway:
    "M64 40 L72 41 L80 39 L92 40 M66 40.5 L66 43 M71 41 L71 43.6 M76 40 L76 42.6 M81 39.4 L81 42",
  city: "M60 60 L60 55 L64 55 L64 52 L68 52 L68 56 L72 56 L72 50 L75 47 L78 50 L78 58 L84 58 L84 60",
};

const WATER = ["bay", "sea", "river", "coast", "cliff", "rock"];

export function makeStamp({ slug, terrain }: StampInput): Stamp {
  const seed = hash(slug);
  const r = rng(seed);
  const t = new Set(terrain);
  const layers: Stamp["layers"] = [];
  const seaY = t.has("gorge") ? 74 : 60 + r() * 6;

  const sx = f1(22 + r() * 56);
  const sy = f1(20 + r() * 8);
  layers.push({ kind: "sun", d: `M${sx} ${sy} m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0` });

  if (t.has("mountains")) {
    layers.push({ kind: "far", d: ridge(r, seaY - 14, 22, 0.55, 30 + r() * 40, 90) });
    layers.push({ kind: "near", d: ridge(r, seaY - 2, 12, 0.5, null, 90) });
  }
  if (t.has("rock"))
    layers.push({ kind: "far", d: ridge(r, seaY - 2, 26, 0.45, 36 + r() * 10, 90) });
  if (t.has("cliff")) layers.push({ kind: "far", d: wall(r, "right", 64 + r() * 8, 90) });
  if (t.has("coast") || t.has("city")) {
    layers.push({ kind: "near", d: ridge(r, seaY - 4, 6, 0.4, null, 90) });
  }
  if (t.has("gorge")) {
    layers.push({ kind: "far", d: wall(r, "left", 30 + r() * 6, 90) });
    layers.push({ kind: "near", d: wall(r, "right", 62 + r() * 6, 90) });
  }

  const wet = WATER.some((w) => t.has(w));
  if (wet) layers.push({ kind: "sea", d: `M4 ${f1(seaY)} L96 ${f1(seaY)} L96 90 L4 90 Z` });
  if (t.has("beach")) {
    const shore: Point[] = [
      [4, 74],
      [30, 72],
      [60, 75],
      [96, 73],
    ];
    layers.push({ kind: "sand", d: smooth(shore, false) + " L96 90 L4 90 Z" });
  }
  for (const motif of Object.keys(MOTIFS)) {
    if (t.has(motif)) layers.push({ kind: "motif", d: MOTIFS[motif] });
  }

  return { seed, seaY, layers, waves: wet ? seigaiha(seaY, 90) : "" };
}
