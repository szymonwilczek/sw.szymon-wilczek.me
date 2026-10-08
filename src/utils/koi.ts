// Koi seen from above, drawn from its spine

import { smooth } from "./sand";
import { rng } from "./stamp";

type Point = [number, number];

export interface KoiShape {
  body: string;
  tail: string;
  rays: string;
  fins: string;
  dorsal: string;
  eyes: Point[];
  patches: string[];
}

export interface KoiKind {
  base: string;
  patches: Array<[number, 1 | -1, number, string]>;
}

const WHITE = "#f4efe6";
export const SUMI = "#2a2622";

export const KINDS: Record<string, KoiKind> = {
  // white with red patches
  kohaku: {
    base: WHITE,
    patches: [
      [0.84, 1, 0.055, "var(--red)"],
      [0.56, -1, 0.07, "var(--red)"],
      [0.3, 1, 0.045, "var(--red)"],
    ],
  },
  // plain gold
  ogon: { base: "#cf9a3a", patches: [] },
  // white with ink and red
  showa: {
    base: WHITE,
    patches: [
      [0.82, -1, 0.045, SUMI],
      [0.6, 1, 0.065, "var(--red)"],
      [0.38, -1, 0.05, SUMI],
      [0.2, 1, 0.03, SUMI],
    ],
  },
};

const f = (n: number) => Math.round(n * 10) / 10;

export function koi(kind: KoiKind, L: number, bend: number, seed: number): KoiShape {
  const rand = rng(seed);
  const W = L * 0.125;
  const n = 18;

  // t: 0 = root of the tail, 1 = nose
  const spine = (t: number): Point => [
    -L * 0.38 + L * 0.8 * t,
    bend * L * 0.16 * Math.sin(Math.PI * (1 - t) * 0.9) ** 1.4,
  ];
  const normal = (t: number): Point => {
    const a = spine(Math.max(0, t - 0.01));
    const b = spine(Math.min(1, t + 0.01));
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [-(b[1] - a[1]) / d, (b[0] - a[0]) / d];
  };
  const width = (t: number) =>
    W * (0.2 + 0.8 * Math.sin(Math.PI * t * 0.82)) * Math.max(0, 1 - t ** 8) ** 0.5;

  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y] = spine(t);
    const [nx, ny] = normal(t);
    const w = width(t);
    left.push([x + nx * w, y + ny * w]);
    right.push([x - nx * w, y - ny * w]);
  }
  const nose = spine(1);
  const body = smooth(
    [...left.slice(0, -1), [nose[0] + L * 0.012, nose[1]], ...right.reverse().slice(1)],
    true,
  );

  // the tail: two soft lobes trailing behind, following the curl
  const [rx, ry] = spine(0);
  const [tnx, tny] = normal(0);
  const bl = Math.hypot(1, bend * 0.5);
  const bx = -1 / bl;
  const by = (-bend * 0.5) / bl;
  const wt = width(0);
  const lobe = L * 0.26;
  const at = (back: number, side: number): Point => [
    rx + bx * lobe * back + tnx * L * side,
    ry + by * lobe * back + tny * L * side,
  ];
  const tail = smooth(
    [
      [rx + tnx * wt, ry + tny * wt],
      at(0.45, 0.07),
      at(1, 0.15),
      at(0.7, 0.02),
      at(0.62, 0),
      at(0.7, -0.02),
      at(1, -0.15),
      at(0.45, -0.07),
      [rx - tnx * wt, ry - tny * wt],
    ],
    true,
  );
  const rays = [-0.11, -0.06, 0.06, 0.11]
    .map((k) => {
      const [qx, qy] = at(0.4, k * 0.5);
      const [ex, ey] = at(0.85, k);
      return `M${f(rx)} ${f(ry)} Q${f(qx)} ${f(qy)} ${f(ex)} ${f(ey)}`;
    })
    .join(" ");

  const fins = ([1, -1] as const)
    .map((side) => {
      const [x, y] = spine(0.74);
      const [nx, ny] = normal(0.74);
      const w = width(0.74);
      const x0 = x + nx * w * side * 0.9;
      const y0 = y + ny * w * side * 0.9;
      return smooth(
        [
          [x0 + L * 0.02, y0],
          [x0 - L * 0.015 + nx * side * L * 0.075, y0 + ny * side * L * 0.075],
          [x0 - L * 0.08 + nx * side * L * 0.075, y0 + ny * side * L * 0.075],
          [x0 - L * 0.07, y0 + ny * side * L * 0.015],
        ],
        true,
      );
    })
    .join(" ");

  const [d0, d1, d2] = [spine(0.3), spine(0.45), spine(0.62)];
  const dorsal = `M${f(d0[0])} ${f(d0[1])} Q${f(d1[0])} ${f(d1[1])} ${f(d2[0])} ${f(d2[1])}`;

  const eyes = ([1, -1] as const).map((side): Point => {
    const [x, y] = spine(0.93);
    const [nx, ny] = normal(0.93);
    const w = width(0.93);
    return [f(x + nx * w * 0.55 * side), f(y + ny * w * 0.55 * side)];
  });

  const patches = kind.patches.map(([t, side, size]) => {
    const [x, y] = spine(t);
    const [nx, ny] = normal(t);
    const w = width(t);
    const cx = x + nx * w * side * 0.4;
    const cy = y + ny * w * side * 0.4;
    const pts: Point[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = L * size * (1 + (rand() - 0.5) * 0.5);
      pts.push([cx + Math.cos(a) * r * 1.6, cy + Math.sin(a) * r]);
    }
    return smooth(pts, true);
  });

  return { body, tail, rays, fins, dorsal, eyes, patches };
}
