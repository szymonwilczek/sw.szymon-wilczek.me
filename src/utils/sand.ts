// The karesansui above the home footer, laid out at build time.

type Point = [number, number];

export interface SandStone {
  x: number;
  y: number;
  rx: number;
  ry: number;
  d: string;
  shadow: string;
  facet: string;
  moss: string;
}

export interface Sand {
  edge: string;
  grains: Array<{ x: number; y: number; r: number }>;
  lines: Array<{ pts: Point[]; w: number; o: number }>;
  rings: Array<{ pts: Point[]; w: number; o: number }>;
  stones: SandStone[];
}

const f = (n: number) => Math.round(n * 10) / 10;

export function smooth(pts: Point[], closed: boolean): string {
  if (pts.length < 2) return "";
  const P = closed
    ? [pts[pts.length - 1], ...pts, pts[0], pts[1]]
    : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${f(P[1][0])} ${f(P[1][1])}`;
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    d +=
      ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)}` +
      ` ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return closed ? `${d} Z` : d;
}

const STONES = [
  { x: 236, y: 76, rx: 32, ry: 23, rings: [14, 23, 31, 42] },
  { x: 604, y: 66, rx: 19, ry: 13, rings: [10, 17, 27] },
  { x: 790, y: 112, rx: 27, ry: 20, rings: [12, 22, 30, 39] },
];

/** Every stone, for keeping raked points out of them */
export const STONE_SHAPES = STONES.map(({ x, y, rx, ry }) => ({ x, y, rx, ry }));

/** The smallest stone: a full ring drawn round it is the one mark the garden keeps */
export const SMALL_STONE = STONES[1];

export function makeSand(): Sand {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const jit = (n: number) => (rnd() - 0.5) * 2 * n;

  function blob(cx: number, cy: number, rx: number, ry: number, rough: number, n = 9, rot = 0) {
    const pts: Point[] = [];
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      const k = 1 + jit(rough);
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return smooth(pts, true);
  }

  // passes of a rake, each a little uneven;
  // lines stop short of the stones
  const lines: Sand["lines"] = [];
  let y = 9;
  while (y < 184) {
    const pass = 3 + Math.round(rnd());
    const tooth = 7.4 + jit(0.8);
    const tilt = jit(2.4);
    const w = 0.9 + rnd() * 0.5;
    for (let t = 0; t < pass && y < 184; t++, y += tooth + jit(0.7)) {
      const segs: Point[][] = [];
      const start = -6 + jit(6);
      const end = 1006 + jit(6);
      let seg: Point[] = [];
      for (let x = start; x <= end; x += 11 + jit(2.5)) {
        const yy = y + tilt * (x / 1000) + Math.sin(x / 170 + y * 0.3) * 1.1 + jit(0.45);
        const hit = STONES.some((s) => {
          const R = s.rx + s.rings[s.rings.length - 1] + 6 + jit(3);
          return ((x - s.x) / R) ** 2 + ((yy - s.y) / (R * 0.78)) ** 2 < 1;
        });
        if (hit) {
          if (seg.length > 1) segs.push(seg);
          seg = [];
          continue;
        }
        seg.push([f(x), f(yy)]);
      }
      if (seg.length > 1) segs.push(seg);
      for (const s of segs) lines.push({ pts: s, w: f(w + jit(0.12)), o: f(0.5 + rnd() * 0.25) });
    }
    y += 2 + rnd() * 3;
  }

  const rings: Sand["rings"] = [];
  for (const s of STONES) {
    for (const g of s.rings) {
      const n = 40;
      const ox = jit(1.6);
      const oy = jit(1.2);
      const pts: Point[] = [];
      const a0 = rnd() * Math.PI * 2;
      const sweep = Math.PI * 2 * (0.94 + rnd() * 0.1);
      for (let i = 0; i <= n; i++) {
        const a = a0 + (i / n) * sweep;
        const r = 1 + jit(0.015);
        pts.push([
          f(s.x + ox + Math.cos(a) * (s.rx + g) * r),
          f(s.y + oy + Math.sin(a) * (s.ry + g * 0.78) * r),
        ]);
      }
      rings.push({ pts, w: f(0.9 + rnd() * 0.5), o: f(0.5 + rnd() * 0.25) });
    }
  }

  const stones = STONES.map((s, i) => ({
    x: s.x,
    y: s.y,
    rx: s.rx,
    ry: s.ry,
    d: blob(s.x, s.y, s.rx, s.ry, 0.12, 8 + i, rnd()),
    shadow: blob(s.x + 5, s.y + 6, s.rx * 1.02, s.ry * 0.9, 0.1, 8, rnd()),
    facet: smooth(
      [
        [s.x - s.rx * 0.5, s.y - s.ry * 0.2],
        [s.x - s.rx * 0.1, s.y - s.ry * 0.45],
        [s.x + s.rx * 0.35, s.y - s.ry * 0.3],
      ],
      false,
    ),
    moss:
      i === 1
        ? ""
        : blob(s.x - s.rx * 0.35, s.y - s.ry * 0.62, s.rx * 0.32, s.ry * 0.22, 0.3, 7, rnd()),
  }));

  const grains = Array.from({ length: 70 }, () => ({
    x: f(rnd() * 1000),
    y: f(6 + rnd() * 178),
    r: f(0.4 + rnd() * 0.7),
  }));

  // ragged edge of the sand bed
  const top: Point[] = [];
  const bot: Point[] = [];
  for (let x = 0; x <= 1000; x += 50) {
    top.push([x, 2 + jit(2)]);
    bot.push([1000 - x, 188 + jit(2)]);
  }
  const edge = smooth([...top, [1003, 95], ...bot, [-3, 95]], true);

  return { edge, grains, lines, rings, stones };
}
