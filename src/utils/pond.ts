// Seeded, so the pond is the same on every build but never regular.

import { smooth } from "./sand";
import { rng } from "./stamp";

type Point = [number, number];

export const POND_W = 1000;
export const POND_H = 250;
export const WATER = { x0: 14, y0: 16, x1: POND_W - 14, y1: POND_H - 16 };

export interface Stone {
  d: string;
  tone: "alt" | "dim" | "border";
}

export interface Pad {
  d: string;
  veins: string;
}

export interface Pond {
  edge: string;
  depth: string;
  glints: string;
  stones: Stone[];
  pads: Pad[];
}

const f = (n: number) => Math.round(n * 10) / 10;

function blob(
  rand: () => number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rough: number,
  n: number,
  rot = 0,
): string {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const k = 1 + (rand() - 0.5) * 2 * rough;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return smooth(pts, true);
}

/** A rounded oblong, wobbling a little all the way round */
function edgeOf(rand: () => number, r = 34): string {
  const { x0, y0, x1, y1 } = WATER;
  const sides: Array<[Point, Point, Point, number]> = [
    [[x0 + r, y0], [x1 - r, y0], [x1 - r, y0 + r], -90],
    [[x1, y0 + r], [x1, y1 - r], [x1 - r, y1 - r], 0],
    [[x1 - r, y1], [x0 + r, y1], [x0 + r, y1 - r], 90],
    [[x0, y1 - r], [x0, y0 + r], [x0 + r, y0 + r], 180],
  ];
  const pts: Point[] = [];
  for (const [[sx, sy], [ex, ey], [cx, cy], a0] of sides) {
    const n = Math.max(1, Math.floor(Math.hypot(ex - sx, ey - sy) / 70));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      pts.push([sx + (ex - sx) * t + (rand() - 0.5) * 3, sy + (ey - sy) * t + (rand() - 0.5) * 5]);
    }
    for (let k = 0; k < 3; k++) {
      const a = ((a0 + 30 * k) * Math.PI) / 180;
      const rr = r * (1 + (rand() - 0.5) * 0.2);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
  }
  return smooth(pts, true);
}

/** Stones gathered in a few clusters along the rim, not spread evenly */
function stonesOf(rand: () => number, count: number): Stone[] {
  const { x0, y0, x1, y1 } = WATER;
  const w = x1 - x0;
  const h = y1 - y0;
  const per = 2 * w + 2 * h;
  const clusters = Array.from({ length: 3 }, (_, k) => per * (k / 3 + rand() * 0.2));
  const tones: Stone["tone"][] = ["alt", "dim", "border"];
  return Array.from({ length: count }, () => {
    const p = (clusters[Math.floor(rand() * clusters.length)] + (rand() - 0.5) * 90 + per) % per;
    let x: number;
    let y: number;
    if (p < w) [x, y] = [x0 + p, y0];
    else if (p < w + h) [x, y] = [x1, y0 + p - w];
    else if (p < 2 * w + h) [x, y] = [x1 - (p - w - h), y1];
    else [x, y] = [x0, y1 - (p - 2 * w - h)];
    x += (rand() - 0.5) * 8;
    y += (rand() - 0.5) * 8;
    const rx = 5 + rand() ** 2 * 16;
    const ry = rx * (0.6 + rand() * 0.25);
    return { d: blob(rand, x, y, rx, ry, 0.14, 8, rand()), tone: tones[Math.floor(rand() * 3)] };
  });
}

function padOf(rand: () => number, x: number, y: number, r: number, rot: number): Pad {
  const notch = (rot * Math.PI) / 180;
  const pts: Point[] = [[x, y]];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const a = notch + 0.22 + ((Math.PI * 2 - 0.44) * i) / n;
    const k = 1 + (rand() - 0.5) * 0.08;
    pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * 0.82 * k]);
  }
  const veins = Array.from({ length: 8 }, (_, i) => {
    const a = notch + 0.5 + i * 0.75;
    return `M${f(x)} ${f(y)} L${f(x + Math.cos(a) * r * 0.8)} ${f(y + Math.sin(a) * r * 0.66)}`;
  }).join(" ");
  return { d: smooth(pts, true), veins };
}

function glintsOf(rand: () => number, count: number): string {
  let d = "";
  for (let i = 0; i < count; i++) {
    const x = 40 + rand() * 920;
    const y = 40 + rand() * 180;
    const w = 10 + rand() * 26;
    d += `M${f(x)} ${f(y)} q${f(w / 2)} -1.2 ${f(w)} 0 `;
  }
  return d.trim();
}

export function makePond(seed = 3): Pond {
  const rand = rng(seed);
  return {
    edge: edgeOf(rand),
    depth: blob(rand, POND_W / 2, POND_H / 2 + 10, POND_W * 0.42, POND_H * 0.36, 0.08, 10),
    glints: glintsOf(rand, 16),
    stones: stonesOf(rand, 22),
    pads: [
      padOf(rand, 150, 70, 30, 40),
      padOf(rand, 186, 104, 19, 200),
      padOf(rand, 560, 64, 24, 120),
      padOf(rand, 890, 190, 34, 300),
      padOf(rand, 930, 150, 18, 10),
    ],
  };
}
