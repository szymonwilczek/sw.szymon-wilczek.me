// Still water at the end of the photo pages and /about

import { smooth } from "./sand";

type Point = [number, number];

export interface Ellipse {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

export interface Layout {
  W: number;
  H: number;
  stones: Ellipse[];
  rim: Ellipse[];
  pads: Array<[number, number, number]>;
  leaf: Point;
  goal: { x: number; y: number };
  seed: number;
}

export const LAYOUTS: Record<"wide" | "tall", Layout> = {
  wide: {
    W: 1000,
    H: 240,
    stones: [
      { x: 300, y: 118, rx: 26, ry: 18 },
      { x: 338, y: 146, rx: 14, ry: 10 },
      { x: 742, y: 92, rx: 22, ry: 15 },
    ],
    rim: [
      { x: 30, y: 70, rx: 18, ry: 13 },
      { x: 52, y: 52, rx: 10, ry: 8 },
      { x: 968, y: 178, rx: 17, ry: 12 },
      { x: 950, y: 198, rx: 10, ry: 7 },
      { x: 520, y: 232, rx: 14, ry: 9 },
      { x: 544, y: 236, rx: 8, ry: 6 },
    ],
    pads: [
      [620, 150, 16],
      [648, 172, 10],
      [178, 66, 12],
    ],
    leaf: [110, 170],
    goal: { x: 890, y: 240 },
    seed: 11,
  },
  tall: {
    W: 400,
    H: 340,
    stones: [
      { x: 120, y: 150, rx: 24, ry: 17 },
      { x: 152, y: 176, rx: 13, ry: 9 },
      { x: 290, y: 238, rx: 20, ry: 14 },
    ],
    rim: [
      { x: 18, y: 60, rx: 16, ry: 11 },
      { x: 34, y: 44, rx: 9, ry: 7 },
      { x: 384, y: 290, rx: 15, ry: 11 },
      { x: 366, y: 306, rx: 9, ry: 7 },
      { x: 210, y: 330, rx: 12, ry: 8 },
    ],
    pads: [
      [280, 96, 15],
      [304, 116, 10],
      [76, 270, 12],
    ],
    leaf: [60, 210],
    goal: { x: 250, y: 70 },
    seed: 11,
  },
};

export function inPond(L: Layout, x: number, y: number) {
  const ax = L.W / 2 - 14;
  const ay = L.H / 2 - 12;
  return ((x - L.W / 2) / ax) ** 4 + ((y - L.H / 2) / ay) ** 4 < 1;
}

export function inStone(L: Layout, x: number, y: number, pad: number) {
  return L.stones.some(
    (s) => ((x - s.x) / (s.rx + pad)) ** 2 + ((y - s.y) / (s.ry + pad)) ** 2 < 1,
  );
}

export interface Water {
  bank: string;
  edge: string;
  lines: Array<{ pts: Point[]; w: number; o: number }>;
  calm: Array<[number, number, number]>;
  stones: Array<{ d: string; shadow: string; facet: string; moss: string }>;
  pads: Array<{ x: number; y: number; d: string; vein: string }>;
}

const f = (n: number) => Math.round(n * 10) / 10;

export function makeWater(L: Layout): Water {
  let seed = L.seed;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const jit = (n: number) => (rnd() - 0.5) * 2 * n;
  const tall = L.H > L.W;

  function blob(cx: number, cy: number, rx: number, ry: number, rough: number, n = 9, rot = 0) {
    const pts: Point[] = [];
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      const k = 1 + jit(rough);
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return smooth(pts, true);
  }

  // short loose strokes, a few to a row, broken where a stone sits
  const lines: Water["lines"] = [];
  for (let y = 20; y < L.H - 16; y += 11 + jit(2.5)) {
    let x = 10 + rnd() * 60;
    while (x < L.W - 30) {
      const len = (tall ? 50 : 110) + rnd() * (tall ? 140 : 300);
      const tilt = jit(1.4);
      let seg: Point[] = [];
      const flush = () => {
        if (seg.length > 2)
          lines.push({ pts: seg, w: f(0.8 + rnd() * 0.6), o: f(0.42 + rnd() * 0.3) });
        seg = [];
      };
      for (let xx = x; xx < Math.min(x + len, L.W - 10); xx += 10) {
        const yy = y + tilt * ((xx - x) / len) + jit(0.4);
        if (!inPond(L, xx, yy) || inStone(L, xx, yy, 8)) {
          flush();
          continue;
        }
        seg.push([f(xx + jit(1)), f(yy)]);
      }
      flush();
      x += len + 20 + rnd() * 70;
    }
  }

  const calm = Array.from({ length: tall ? 10 : 22 }, (): [number, number, number] => {
    let x: number;
    let y: number;
    do {
      x = 30 + rnd() * (L.W - 60);
      y = 20 + rnd() * (L.H - 40);
    } while (!inPond(L, x, y) || inStone(L, x, y, 10));
    return [f(x), f(y), f(8 + rnd() * 16)];
  });

  const ring = (k: number, r: number) => {
    const ax = L.W / 2 - 14;
    const ay = L.H / 2 - 12;
    const pts: Point[] = [];
    for (let n = 0; n < 36; n++) {
      const a = (n / 36) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const sx = Math.sign(c) * Math.abs(c) ** 0.5;
      const sy = Math.sign(s) * Math.abs(s) ** 0.5;
      pts.push([L.W / 2 + sx * (ax + k) * (1 + jit(r)), L.H / 2 + sy * (ay + k) * (1 + jit(r))]);
    }
    return smooth(pts, true);
  };
  const bank = ring(12, 0.012);
  const edge = ring(1, 0.008);

  const stones = [...L.stones, ...L.rim].map((s, i) => ({
    shadow: blob(s.x + 4, s.y + 5, s.rx * 1.02, s.ry * 0.9, 0.1, 8, rnd()),
    d: blob(s.x, s.y, s.rx, s.ry, 0.12, 8 + (i % 3), rnd()),
    facet: smooth(
      [
        [s.x - s.rx * 0.5, s.y - s.ry * 0.2],
        [s.x - s.rx * 0.1, s.y - s.ry * 0.45],
        [s.x + s.rx * 0.35, s.y - s.ry * 0.3],
      ],
      false,
    ),
    moss:
      i % 2 === 0
        ? blob(s.x - s.rx * 0.35, s.y - s.ry * 0.6, s.rx * 0.32, s.ry * 0.22, 0.3, 7, rnd())
        : "",
  }));

  // lily pads
  const pads = L.pads.map(([x, y, r]) => {
    const rot = rnd() * Math.PI * 2;
    const a0 = rot - 0.22;
    const a1 = rot + 0.22;
    const ray = (a: number, k: number) =>
      `M0 0 L${f(Math.cos(a) * r * k)} ${f(Math.sin(a) * r * k)}`;
    return {
      x,
      y,
      d:
        `M0 0 L${f(Math.cos(a0) * r)} ${f(Math.sin(a0) * r)}` +
        ` A${r} ${f(r * 0.86)} 0 1 0 ${f(Math.cos(a1) * r)} ${f(Math.sin(a1) * r)} Z`,
      vein: [ray(rot + Math.PI, 0.8), ray(rot + 2.2, 0.7), ray(rot - 2.2, 0.7)].join(" "),
    };
  });

  return { bank, edge, lines, calm, stones, pads };
}
