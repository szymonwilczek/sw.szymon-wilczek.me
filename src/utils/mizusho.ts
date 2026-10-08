// The slab of stone at the end of /contact, for writing on with water.

import { smooth } from "./sand";

type Point = [number, number];

export interface Slab {
  W: number;
  H: number;
  d: string;
  shadow: string;
  grains: Array<[number, number, number]>;
  crack: string;
  moss: string;
  glyph: { x: number; y: number; size: number };
  box: [number, number, number, number];
  seal: Point;
}

const f = (n: number) => Math.round(n * 10) / 10;

export function makeSlab(tall: boolean): Slab {
  let seed = 31;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const jit = (n: number) => (rnd() - 0.5) * 2 * n;

  const W = tall ? 400 : 1000;
  const H = tall ? 420 : 320;
  const x0 = 18;
  const y0 = 14;
  const x1 = W - 18;
  const y1 = H - 22;

  // four slightly crooked sides, cut by hand
  const pts: Point[] = [];
  const side = (ax: number, ay: number, bx: number, by: number, n: number) => {
    for (let k = 0; k < n; k++) {
      const t = k / n;
      pts.push([ax + (bx - ax) * t + jit(2.2), ay + (by - ay) * t + jit(2.2)]);
    }
  };
  side(x0 + 10, y0, x1 - 10, y0 + 4, 12);
  side(x1, y0 + 8, x1 - 4, y1 - 10, 6);
  side(x1 - 12, y1, x0 + 14, y1 - 3, 12);
  side(x0, y1 - 10, x0 + 3, y0 + 10, 6);

  const grains = Array.from({ length: tall ? 70 : 140 }, (): [number, number, number] => [
    f(x0 + 8 + rnd() * (x1 - x0 - 16)),
    f(y0 + 8 + rnd() * (y1 - y0 - 16)),
    f(0.5 + rnd() * 0.9),
  ]);

  const crack: Point[] = [];
  let cx = x1 - (tall ? 90 : 210);
  let cy = y0 + 2;
  for (let k = 0; k < 7; k++) {
    crack.push([cx, cy]);
    cx += jit(14) - 4;
    cy += (y1 - y0) / (tall ? 14 : 9) + jit(5);
  }

  const mossPts: Point[] = [];
  for (let i = 0; i < 9; i++) {
    const a = 1 + (i / 9) * Math.PI * 2;
    const k = 1 + jit(0.3);
    mossPts.push([x0 + 34 + Math.cos(a) * 26 * k, y1 - 8 + Math.sin(a) * 9 * k]);
  }

  return {
    W,
    H,
    d: smooth(pts, true),
    shadow: smooth(
      pts.map(([x, y]): Point => [x + 6, y + 8]),
      true,
    ),
    grains,
    crack: smooth(crack, false),
    moss: smooth(mossPts, true),
    glyph: { x: W / 2, y: H / 2 + 70, size: tall ? 230 : 210 },
    box: tall
      ? [W / 2 - 115, H / 2 - 115, W / 2 + 115, H / 2 + 100]
      : [W / 2 - 110, H / 2 - 110, W / 2 + 110, H / 2 + 95],
    seal: tall ? [W - 70, 26] : [W - 90, 28],
  };
}
