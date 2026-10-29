// Sealed link on /paste/ as a QR code drawn in ink:
// every dark module a drop, the three finders brush squares, on a torn slip.
// Error correction H leaves room for the wobble. The same link always draws the same way.

import { encode } from "uqr";
import { hash, rng, smooth } from "./stamp";

type Point = [number, number];

export const UNIT = 10;
const QUIET = 4;
const FINDER = 7;
const EYE_AT = 3.5;

const DROP_RADIUS = 0.47;
const DROP_SHRINK = 0.84;
const DROP_SWELL = 1.08;
const DROP_DRIFT = 0.04;
const DROP_WOBBLE = 0.09;
const DROP_POINTS = 7;

const EYE_RADIUS = 1.62;
const EYE_WOBBLE = 0.05;
const EYE_POINTS = 9;

const RING_JITTER = 0.1;
const RING_SOFTEN = 0.9;
const RING_STEP = 1;

const SLIP_INSET = 0.6;
const SLIP_JITTER = 0.18;
const SLIP_SOFTEN = 0.5;
const SLIP_STEP = 1.6;

export interface InkQr {
  size: number;
  slip: string;
  ink: string;
  finders: string;
}

const spread = (rand: () => number, by: number) => (rand() * 2 - 1) * by;

function drop(
  rand: () => number,
  cx: number,
  cy: number,
  radius: number,
  wobble: number,
  points: number,
): string {
  const start = rand() * Math.PI * 2;
  const outline: Point[] = Array.from({ length: points }, (_, index) => {
    const angle = start + (index * Math.PI * 2) / points;
    const reach = radius * (1 + spread(rand, wobble));
    return [(cx + reach * Math.cos(angle)) * UNIT, (cy + reach * Math.sin(angle)) * UNIT];
  });
  return smooth(outline, true);
}

// hand-drawn rectangle
function brushRect(
  rand: () => number,
  [x0, y0, x1, y1]: [number, number, number, number],
  jitter: number,
  soften: number,
  step: number,
): string {
  const corners: Point[] = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
  const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];
  const outline: Point[] = [];
  corners.forEach(([ax, ay], side) => {
    const [bx, by] = corners[(side + 1) % corners.length];
    const steps = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay) / step));
    for (let s = 0; s < steps; s++) {
      let x = ax + ((bx - ax) * s) / steps;
      let y = ay + ((by - ay) * s) / steps;
      if (s === 0) {
        x += ((cx - x) * soften) / (x1 - x0);
        y += ((cy - y) * soften) / (y1 - y0);
      }
      outline.push([(x + spread(rand, jitter)) * UNIT, (y + spread(rand, jitter)) * UNIT]);
    }
  });
  return smooth(outline, true);
}

export function inkQr(text: string): InkQr {
  const { data, size: modules } = encode(text, { ecc: "H", border: 0 });
  const rand = rng(hash(text));
  const size = modules + QUIET * 2;
  const finders: Point[] = [
    [0, 0],
    [modules - FINDER, 0],
    [0, modules - FINDER],
  ];
  const inFinder = (x: number, y: number) =>
    finders.some(([fx, fy]) => x >= fx && x < fx + FINDER && y >= fy && y < fy + FINDER);

  const ink: string[] = [];
  data.forEach((row, y) =>
    row.forEach((isDark, x) => {
      if (!isDark || inFinder(x, y)) return;
      const radius = DROP_RADIUS * (DROP_SHRINK + rand() * (DROP_SWELL - DROP_SHRINK));
      const cx = x + QUIET + 0.5 + spread(rand, DROP_DRIFT);
      const cy = y + QUIET + 0.5 + spread(rand, DROP_DRIFT);
      ink.push(drop(rand, cx, cy, radius, DROP_WOBBLE, DROP_POINTS));
    }),
  );
  const rings = finders.flatMap(([fx, fy]) => {
    const [ox, oy] = [fx + QUIET, fy + QUIET];
    return [
      brushRect(rand, [ox, oy, ox + FINDER, oy + FINDER], RING_JITTER, RING_SOFTEN, RING_STEP),
      brushRect(
        rand,
        [ox + 1, oy + 1, ox + FINDER - 1, oy + FINDER - 1],
        RING_JITTER * 0.7,
        RING_SOFTEN * 0.7,
        RING_STEP,
      ),
      drop(rand, ox + EYE_AT, oy + EYE_AT, EYE_RADIUS, EYE_WOBBLE, EYE_POINTS),
    ];
  });

  const edge = size - SLIP_INSET;
  const slip = brushRect(
    rand,
    [SLIP_INSET, SLIP_INSET, edge, edge],
    SLIP_JITTER,
    SLIP_SOFTEN,
    SLIP_STEP,
  );
  return { size: size * UNIT, slip, ink: ink.join(" "), finders: rings.join(" ") };
}
