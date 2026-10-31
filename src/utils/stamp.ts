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
export function hash(text: string): number {
  let hashed = 2166136261;
  for (const character of text) {
    hashed ^= character.charCodeAt(0);
    hashed = Math.imul(hashed, 16777619);
  }
  return hashed >>> 0;
}

export function rng(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

const round1 = (value: number) => Math.round(value * 10) / 10;

type Point = [number, number];

// Catmull-Rom through the points, written as cubic Beziers
export function smooth(points: Point[], closed: boolean): string {
  if (points.length < 2) return "";
  const padded = closed
    ? [points[points.length - 1], ...points, points[0], points[1]]
    : [points[0], ...points, points[points.length - 1]];
  let path = `M${round1(padded[1][0])} ${round1(padded[1][1])}`;
  for (let i = 1; i < padded.length - 2; i++) {
    const [beforeX, beforeY] = padded[i - 1];
    const [fromX, fromY] = padded[i];
    const [toX, toY] = padded[i + 1];
    const [afterX, afterY] = padded[i + 2];
    path +=
      ` C${round1(fromX + (toX - beforeX) / 6)} ${round1(fromY + (toY - beforeY) / 6)}` +
      ` ${round1(toX - (afterX - fromX) / 6)} ${round1(toY - (afterY - fromY) / 6)} ${round1(toX)} ${round1(toY)}`;
  }
  return closed ? path + " Z" : path;
}

// midpoint-displacement ridge across the art window,
// closed to the bottom
function ridge(
  rand: () => number,
  base: number,
  amplitude: number,
  rough: number,
  peakAt: number | null,
  bottom: number,
): string {
  let points: Point[] = [
    [4, base],
    [96, base],
  ];
  for (let level = 0; level < 4; level++) {
    const next: Point[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const [leftX, leftY] = points[i];
      const [rightX, rightY] = points[i + 1];
      next.push(points[i], [
        (leftX + rightX) / 2,
        (leftY + rightY) / 2 + (rand() - 0.5) * amplitude * Math.pow(rough, level),
      ]);
    }
    next.push(points[points.length - 1]);
    points = next;
  }
  if (peakAt !== null) {
    points = points.map(([x, y]) => [
      x,
      y - amplitude * 0.9 * Math.exp(-Math.pow((x - peakAt) / 16, 2)),
    ]);
  }
  return smooth(points, false) + ` L96 ${bottom} L4 ${bottom} Z`;
}

function wall(rand: () => number, side: "left" | "right", inner: number, bottom: number): string {
  const points: Point[] = [];
  for (let y = 4; y <= bottom; y += 9) points.push([inner + (rand() - 0.5) * 9, y]);
  const edge = side === "left" ? 4 : 96;
  return smooth(points, false) + ` L${edge} ${bottom} L${edge} 4 Z`;
}

// overlapping arcs standing in for water
function seigaiha(top: number, bottom: number): string {
  let path = "";
  let row = 0;
  for (let y = top + 4; y < bottom + 6; y += 4, row++) {
    for (let x = (row % 2) * 4; x < 100; x += 8) {
      path += `M${x - 4} ${y} a4 4 0 0 1 8 0 M${x - 2.6} ${y} a2.6 2.6 0 0 1 5.2 0 `;
    }
  }
  return path;
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
  const rand = rng(seed);
  const features = new Set(terrain);
  const layers: Stamp["layers"] = [];
  const seaY = features.has("gorge") ? 74 : 60 + rand() * 6;

  const sunX = round1(22 + rand() * 56);
  const sunY = round1(20 + rand() * 8);
  layers.push({ kind: "sun", d: `M${sunX} ${sunY} m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0` });

  if (features.has("mountains")) {
    layers.push({ kind: "far", d: ridge(rand, seaY - 14, 22, 0.55, 30 + rand() * 40, 90) });
    layers.push({ kind: "near", d: ridge(rand, seaY - 2, 12, 0.5, null, 90) });
  }
  if (features.has("rock"))
    layers.push({ kind: "far", d: ridge(rand, seaY - 2, 26, 0.45, 36 + rand() * 10, 90) });
  if (features.has("cliff"))
    layers.push({ kind: "far", d: wall(rand, "right", 64 + rand() * 8, 90) });
  if (features.has("coast") || features.has("city")) {
    layers.push({ kind: "near", d: ridge(rand, seaY - 4, 6, 0.4, null, 90) });
  }
  if (features.has("gorge")) {
    layers.push({ kind: "far", d: wall(rand, "left", 30 + rand() * 6, 90) });
    layers.push({ kind: "near", d: wall(rand, "right", 62 + rand() * 6, 90) });
  }

  const wet = WATER.some((kind) => features.has(kind));
  if (wet) layers.push({ kind: "sea", d: `M4 ${round1(seaY)} L96 ${round1(seaY)} L96 90 L4 90 Z` });
  if (features.has("beach")) {
    const shore: Point[] = [
      [4, 74],
      [30, 72],
      [60, 75],
      [96, 73],
    ];
    layers.push({ kind: "sand", d: smooth(shore, false) + " L96 90 L4 90 Z" });
  }
  for (const motif of Object.keys(MOTIFS)) {
    if (features.has(motif)) layers.push({ kind: "motif", d: MOTIFS[motif] });
  }

  return { seed, seaY, layers, waves: wet ? seigaiha(seaY, 90) : "" };
}
