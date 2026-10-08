// Susuki under the moon at the end of an essay.
// Seeded, so the page and its script grow the same field.

import { smooth } from "./sand";

type Point = [number, number];

export interface Blade {
  x: number;
  y: number;
  L: number;
  lean: number;
  w: number;
  o: number;
  plume: boolean;
  side: number;
}

export interface Field {
  W: number;
  H: number;
  gy: number;
  blades: Blade[];
  moon: { x: number; y: number; r: number; shade: string };
  hare: { x: number; body: string; head: string; ears: string; eye: Point };
  ground: string;
}

const f = (n: number) => Math.round(n * 10) / 10;

export function makeField(tall: boolean): Field {
  let seed = 23;
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

  const W = tall ? 400 : 1000;
  const H = tall ? 340 : 280;
  const gy = H - 14;
  const blades: Blade[] = [];
  const n = tall ? 90 : 180;
  for (let k = 0; k < n; k++) {
    blades.push({
      x: ((k + 0.5) / n) * W + jit((W / n) * 0.9),
      y: gy + jit(2.5),
      L: H * 0.28 + rnd() * H * 0.52,
      lean: jit(0.18) + 0.04,
      w: f(0.7 + rnd() * 0.9),
      o: f(0.45 + rnd() * 0.45),
      plume: rnd() < 0.32,
      side: rnd() < 0.5 ? -1 : 1,
    });
  }

  const hx = W * (tall ? 0.36 : 0.62);
  for (let k = 0; k < 46; k++) {
    blades.push({
      x: hx - 34 + (k / 45) * 80 + jit(2.5),
      y: gy + jit(2),
      L: 78 + rnd() * 60,
      lean: jit(0.22),
      w: f(1.1 + rnd() * 0.8),
      o: f(0.62 + rnd() * 0.3),
      plume: rnd() < 0.25,
      side: rnd() < 0.5 ? -1 : 1,
    });
  }

  const mx = W * (tall ? 0.72 : 0.8);
  const my = H * (tall ? 0.2 : 0.25);
  const moon = {
    x: f(mx),
    y: f(my),
    r: tall ? 40 : 38,
    shade: [
      blob(mx - 9, my + 6, 9, 7, 0.2, 7, 1),
      blob(mx + 12, my - 10, 6, 5, 0.2, 7, 2),
      blob(mx + 6, my + 16, 4, 3, 0.2, 6, 3),
    ].join(" "),
  };

  const hare = {
    x: hx,
    body: blob(hx, gy - 15, 18, 15, 0.06, 9, 0.3),
    head: blob(hx + 15, gy - 33, 9.5, 8, 0.06, 8, 0.2),
    ears:
      smooth(
        [
          [hx + 10, gy - 38],
          [hx + 4, gy - 56],
          [hx + 1, gy - 64],
          [hx + 5, gy - 62],
          [hx + 14, gy - 40],
        ],
        true,
      ) +
      " " +
      smooth(
        [
          [hx + 15, gy - 40],
          [hx + 14, gy - 60],
          [hx + 16, gy - 67],
          [hx + 19, gy - 61],
          [hx + 19, gy - 40],
        ],
        true,
      ),
    eye: [f(hx + 19), f(gy - 35)] as Point,
  };

  const pts: Point[] = [];
  for (let x = -4; x <= W + 4; x += 25) pts.push([x, gy + jit(1.6)]);

  return { W, H, gy, blades, moon, hare, ground: smooth(pts, false) };
}

/** A blade bent by `th` from its lean, and the plume at its tip if it has one */
export function bladePath(b: Blade, th: number): { d: string; plume: string } {
  const ang = b.lean + th;
  const mid = b.lean * 0.5 + th * 0.45;
  const cx = b.x + Math.sin(mid) * b.L * 0.55;
  const cy = b.y - Math.cos(mid) * b.L * 0.55;
  const tx = b.x + Math.sin(ang) * b.L;
  const ty = b.y - Math.cos(ang) * b.L * 0.97;
  const d = `M${f(b.x)} ${f(b.y)} Q${f(cx)} ${f(cy)} ${f(tx)} ${f(ty)}`;
  if (!b.plume) return { d, plume: "" };
  let plume = "";
  for (let k = 0; k < 7; k++) {
    const t = 0.6 + k * 0.06;
    const sx = (1 - t) * (1 - t) * b.x + 2 * (1 - t) * t * cx + t * t * tx;
    const sy = (1 - t) * (1 - t) * b.y + 2 * (1 - t) * t * cy + t * t * ty;
    const da = ang + (k % 2 ? 1 : -1) * b.side * (0.5 - k * 0.04) + 0.25;
    const len = 9 + k * 1.6;
    plume +=
      `M${f(sx)} ${f(sy)} q${f(Math.sin(da) * len * 0.6)} ${f(-Math.cos(da) * len * 0.6)}` +
      ` ${f(Math.sin(da + 0.4) * len)} ${f(-Math.cos(da + 0.4) * len * 0.8)} `;
  }
  return { d, plume };
}
