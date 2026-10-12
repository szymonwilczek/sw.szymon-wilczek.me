// Each repository pressed like a specimen in a herbarium.
// Seeded by the title, so every build draws the same hand.

import { smooth } from "./sand";
import { hash, rng } from "./stamp";

type Point = [number, number];

const TAU = Math.PI * 2;
const f = (n: number) => Math.round(n * 10) / 10;

/** Points along an ellipse, or a part of one, from a0 to a1 */
function arc(cx: number, cy: number, r: number, ry = r, a0 = 0, a1 = TAU, n = 14): Point[] {
  return Array.from({ length: n + 1 }, (_, k) => {
    const a = a0 + ((a1 - a0) * k) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * ry];
  });
}

// few strokes per repository
// prettier-ignore
const SKETCH: Record<string, Point[][]> = {
  LOTA: [
    [[30, 6], [50, 12], [48, 33], [30, 54], [12, 33], [10, 12], [30, 6]],
    [[20, 30], [27, 38], [41, 21]],
  ],
  alloyctl: [
    arc(30, 34, 15, 21, -Math.PI, Math.PI),
    [[30, 13], [30, 28]],
    [[15, 30], [45, 30]],
    [[30, 18], [30, 23]],
    [[30, 13], [28, 7], [34, 3], [40, 4]],
  ],
  "Talos 7": [
    [[6, 30], [24, 26], [26, 44], [8, 48], [6, 30]],
    [[30, 24], [48, 20], [50, 38], [32, 42], [30, 24]],
    [[14, 12], [32, 8], [33, 20]],
    [[11, 33], [19, 31.5], [20, 41]],
    [[35, 27], [43, 25.5], [44, 35]],
  ],
  "Skręcior": [
    arc(26, 32, 20),
    arc(26, 32, 6),
    arc(26, 32, 13, 13, 0.4, 1.9, 6),
    [[52, 6], [50, 26], [36, 38]],
    [[49, 6], [55, 6]],
  ],
  Asmodeus: [
    [[18, 8], [12, 10], [13, 28], [7, 31], [13, 34], [12, 50], [18, 52]],
    [[42, 8], [48, 10], [47, 28], [53, 31], [47, 34], [48, 50], [42, 52]],
    [[21, 46], [29, 12]],
    [[26, 28], [38, 46]],
  ],
  Eikon: [
    [[6, 20], [20, 20], [24, 13], [36, 13], [40, 20], [54, 20], [54, 48], [6, 48], [6, 20]],
    arc(30, 34, 10),
    arc(30, 34, 4),
    [[46, 26], [50, 26]],
  ],
  "This Portfolio": [arc(30, 30, 22, 22, -1.2, 4.6, 18), [[30, 30], [30.6, 30.4]]],
  Hati: [
    [[18, 12], [18, 44], [26, 37], [32, 50], [37, 48], [31, 35], [42, 35], [18, 12]],
    arc(26, 32, 24, 22, -0.2, 5.2, 18),
  ],
  Carmenta: [
    arc(30, 30, 22),
    [[20, 34], [26, 41], [34, 41], [40, 34]],
    [[22, 22], [23, 25]],
    [[37, 22], [37, 25]],
  ],
  SLAB: [
    [[6, 8], [54, 8], [54, 52], [6, 52], [6, 8]],
    [[32, 8], [31, 52]],
    [[32, 28], [54, 29]],
    [[6, 14], [32, 14]],
  ],
  Prometheus: [
    [[12, 52], [36, 22]],
    [[34, 25], [40, 14], [46, 10], [44, 18], [37, 26]],
    [[46, 34], [50, 42], [48, 48], [43, 48], [41, 42], [46, 34]],
  ],
  Palaemon: [
    [[6, 18], [54, 18], [48, 40], [12, 40], [6, 18]],
    ...[14, 22, 30, 38, 46].map((x): Point[] => [[x, 25], [x + 1, 25]]),
    ...[18, 26, 34, 42].map((x): Point[] => [[x, 33], [x + 1, 33]]),
    [[30, 40], [30, 54]],
  ],
  "arete.nvim": [arc(22, 24, 13), arc(38, 24, 13), arc(30, 38, 13)],
  Maturator: [
    [[22, 52], [20, 54], [16, 52], [24, 30], [30, 8], [36, 6], [38, 8]],
    [[34, 34], [38, 40], [44, 24], [54, 24]],
    [[46, 30], [52, 30]],
  ],
  "Instant Book Exchange": [
    [[30, 16], [18, 10], [6, 12], [6, 46], [18, 44], [30, 50], [42, 44], [54, 46], [54, 12], [42, 10], [30, 16]],
    [[30, 16], [30, 50]],
    [[12, 20], [24, 22]],
    [[36, 22], [48, 20]],
  ],
  "Vim Be Better": [
    [[8, 12], [22, 48], [36, 12]],
    [[40, 30], [52, 30], [52, 46], [40, 46], [40, 30]],
    [[44, 34], [44, 42]],
  ],
  Wavelength: [
    [[4, 34], [12, 22], [20, 34], [28, 46], [36, 34], [44, 22], [52, 34], [56, 40]],
    [[30, 18], [30, 4]],
    arc(30, 4, 3),
  ],
};

// straight runs get points along them, so the smoothing keeps the corners
function dense(pts: Point[]): Point[] {
  const out: Point[] = [pts[0]];
  for (let k = 1; k < pts.length; k++) {
    const [ax, ay] = pts[k - 1];
    const [bx, by] = pts[k];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 7));
    for (let s = 1; s <= n; s++) out.push([ax + ((bx - ax) * s) / n, ay + ((by - ay) * s) / n]);
  }
  return out;
}

export interface Sketch {
  strokes: Array<{ d: string; w: number }>;
  wash: string;
}

/** repository's drawing, redrawn with a tremble */
export function sketch(title: string): Sketch {
  const rand = rng(hash(`${title}·pen`));
  const jit = (a: number) => (rand() - 0.5) * 2 * a;
  const strokes = (SKETCH[title] ?? []).map((pts, k) => ({
    d: smooth(
      dense(pts).map(([x, y]): Point => [x + jit(0.7), y + jit(0.7)]),
      false,
    ),
    w: k === 0 ? 1.7 : 1.3,
  }));
  const cx = 30 + jit(5);
  const cy = 32 + jit(5);
  const rx = 17 + rand() * 6;
  const ry = 13 + rand() * 6;
  const turn = rand() * 3;
  const wash = Array.from({ length: 9 }, (_, i): Point => {
    const a = turn + (i / 9) * TAU;
    const k = 1 + jit(0.22);
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
  return { strokes, wash: smooth(wash, true) };
}

/** deckled edge round a wxh sheet: small teeth all the way round */
export function deckle(title: string, w: number, h: number, amp: number, step: number): string {
  const rand = rng(hash(`${title}·edge`));
  const jit = (a: number) => (rand() - 0.5) * 2 * a;
  const clamp = (v: number, top: number) => Math.min(top, Math.max(0, v));
  const pts: Point[] = [];
  for (let x = 0; x <= w; x += step + jit(step * 0.4)) pts.push([x, amp + jit(amp)]);
  for (let y = 0; y <= h; y += step * 2 + jit(step)) pts.push([w - amp * 0.4 + jit(amp * 0.4), y]);
  for (let x = w; x >= 0; x -= step + jit(step * 0.4)) pts.push([x, h - amp + jit(amp)]);
  for (let y = h; y >= 0; y -= step * 2 + jit(step)) pts.push([amp * 0.4 + jit(amp * 0.4), y]);
  return `M${pts.map(([x, y]) => `${f(clamp(x, w))} ${f(clamp(y, h))}`).join(" L")} Z`;
}

/** coloured-pencil loop round a word in a wxh box, never closing where it began */
export function pencilLoop(seed: string, w = 100, h = 34): string {
  const rand = rng(hash(`${seed}·loop`));
  const jit = (a: number) => (rand() - 0.5) * 2 * a;
  const a0 = -2.2 + jit(0.3);
  const pts = Array.from({ length: 23 }, (_, k): Point => {
    const a = a0 + (k / 22) * (TAU + 0.5);
    const r = 1 + jit(0.05) + k * 0.004;
    return [w / 2 + Math.cos(a) * (w / 2) * r, h / 2 + Math.sin(a) * (h / 2) * r];
  });
  return smooth(pts, false);
}

// each kind of work has its own pencil
const KIND: Record<string, string> = {
  academic: "var(--fg-link)",
  experiment: "var(--cursor)",
  manifest: "var(--red)",
};

export function kindInk(badge: string): string {
  return KIND[badge] ?? "var(--fg-dim)";
}
