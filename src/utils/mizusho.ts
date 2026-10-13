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

const round1 = (value: number) => Math.round(value * 10) / 10;

export function makeSlab(tall: boolean): Slab {
  let seed = 31;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const jitter = (amount: number) => (rand() - 0.5) * 2 * amount;

  const width = tall ? 400 : 1000;
  const height = tall ? 420 : 320;
  const left = 18;
  const top = 14;
  const right = width - 18;
  const bottom = height - 22;

  // four slightly crooked sides, cut by hand
  const outline: Point[] = [];
  const side = (fromX: number, fromY: number, toX: number, toY: number, steps: number) => {
    for (let step = 0; step < steps; step++) {
      const along = step / steps;
      outline.push([
        fromX + (toX - fromX) * along + jitter(2.2),
        fromY + (toY - fromY) * along + jitter(2.2),
      ]);
    }
  };
  side(left + 10, top, right - 10, top + 4, 12);
  side(right, top + 8, right - 4, bottom - 10, 6);
  side(right - 12, bottom, left + 14, bottom - 3, 12);
  side(left, bottom - 10, left + 3, top + 10, 6);

  const grains = Array.from({ length: tall ? 70 : 140 }, (): [number, number, number] => [
    round1(left + 8 + rand() * (right - left - 16)),
    round1(top + 8 + rand() * (bottom - top - 16)),
    round1(0.5 + rand() * 0.9),
  ]);

  const crack: Point[] = [];
  let crackX = right - (tall ? 90 : 210);
  let crackY = top + 2;
  for (let joint = 0; joint < 7; joint++) {
    crack.push([crackX, crackY]);
    crackX += jitter(14) - 4;
    crackY += (bottom - top) / (tall ? 14 : 9) + jitter(5);
  }

  const mossPts: Point[] = [];
  for (let i = 0; i < 9; i++) {
    const angle = 1 + (i / 9) * Math.PI * 2;
    const wobble = 1 + jitter(0.3);
    mossPts.push([
      left + 34 + Math.cos(angle) * 26 * wobble,
      bottom - 8 + Math.sin(angle) * 9 * wobble,
    ]);
  }

  return {
    W: width,
    H: height,
    d: smooth(outline, true),
    shadow: smooth(
      outline.map(([x, y]): Point => [x + 6, y + 8]),
      true,
    ),
    grains,
    crack: smooth(crack, false),
    moss: smooth(mossPts, true),
    glyph: { x: width / 2, y: height / 2 + 70, size: tall ? 230 : 210 },
    box: tall
      ? [width / 2 - 115, height / 2 - 115, width / 2 + 115, height / 2 + 100]
      : [width / 2 - 110, height / 2 - 110, width / 2 + 110, height / 2 + 95],
    seal: tall ? [width - 70, 26] : [width - 90, 28],
  };
}
