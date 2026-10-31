// Still water at the end of the photo pages and /about

import { smooth } from "./stamp";

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

export function inPond(layout: Layout, x: number, y: number) {
  const radiusX = layout.W / 2 - 14;
  const radiusY = layout.H / 2 - 12;
  return ((x - layout.W / 2) / radiusX) ** 4 + ((y - layout.H / 2) / radiusY) ** 4 < 1;
}

export function inStone(layout: Layout, x: number, y: number, margin: number) {
  return layout.stones.some(
    (stone) =>
      ((x - stone.x) / (stone.rx + margin)) ** 2 + ((y - stone.y) / (stone.ry + margin)) ** 2 < 1,
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

const round1 = (value: number) => Math.round(value * 10) / 10;

export function makeWater(layout: Layout): Water {
  let seed = layout.seed;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const jitter = (amount: number) => (rand() - 0.5) * 2 * amount;
  const tall = layout.H > layout.W;

  function blob(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    rough: number,
    corners = 9,
    rotation = 0,
  ) {
    const points: Point[] = [];
    for (let i = 0; i < corners; i++) {
      const angle = rotation + (i / corners) * Math.PI * 2;
      const wobble = 1 + jitter(rough);
      points.push([cx + Math.cos(angle) * rx * wobble, cy + Math.sin(angle) * ry * wobble]);
    }
    return smooth(points, true);
  }

  // short loose strokes, a few to a row, broken where a stone sits
  const lines: Water["lines"] = [];
  for (let y = 20; y < layout.H - 16; y += 11 + jitter(2.5)) {
    let x = 10 + rand() * 60;
    while (x < layout.W - 30) {
      const length = (tall ? 50 : 110) + rand() * (tall ? 140 : 300);
      const tilt = jitter(1.4);
      let segment: Point[] = [];
      const flush = () => {
        if (segment.length > 2)
          lines.push({
            pts: segment,
            w: round1(0.8 + rand() * 0.6),
            o: round1(0.42 + rand() * 0.3),
          });
        segment = [];
      };
      for (let pointX = x; pointX < Math.min(x + length, layout.W - 10); pointX += 10) {
        const pointY = y + tilt * ((pointX - x) / length) + jitter(0.4);
        if (!inPond(layout, pointX, pointY) || inStone(layout, pointX, pointY, 8)) {
          flush();
          continue;
        }
        segment.push([round1(pointX + jitter(1)), round1(pointY)]);
      }
      flush();
      x += length + 20 + rand() * 70;
    }
  }

  const calm = Array.from({ length: tall ? 10 : 22 }, (): [number, number, number] => {
    let x: number;
    let y: number;
    do {
      x = 30 + rand() * (layout.W - 60);
      y = 20 + rand() * (layout.H - 40);
    } while (!inPond(layout, x, y) || inStone(layout, x, y, 10));
    return [round1(x), round1(y), round1(8 + rand() * 16)];
  });

  const ring = (offset: number, roughness: number) => {
    const radiusX = layout.W / 2 - 14;
    const radiusY = layout.H / 2 - 12;
    const points: Point[] = [];
    for (let step = 0; step < 36; step++) {
      const angle = (step / 36) * Math.PI * 2;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const squashX = Math.sign(cosine) * Math.abs(cosine) ** 0.5;
      const squashY = Math.sign(sine) * Math.abs(sine) ** 0.5;
      points.push([
        layout.W / 2 + squashX * (radiusX + offset) * (1 + jitter(roughness)),
        layout.H / 2 + squashY * (radiusY + offset) * (1 + jitter(roughness)),
      ]);
    }
    return smooth(points, true);
  };
  const bank = ring(12, 0.012);
  const edge = ring(1, 0.008);

  const stones = [...layout.stones, ...layout.rim].map((stone, i) => ({
    shadow: blob(stone.x + 4, stone.y + 5, stone.rx * 1.02, stone.ry * 0.9, 0.1, 8, rand()),
    d: blob(stone.x, stone.y, stone.rx, stone.ry, 0.12, 8 + (i % 3), rand()),
    facet: smooth(
      [
        [stone.x - stone.rx * 0.5, stone.y - stone.ry * 0.2],
        [stone.x - stone.rx * 0.1, stone.y - stone.ry * 0.45],
        [stone.x + stone.rx * 0.35, stone.y - stone.ry * 0.3],
      ],
      false,
    ),
    moss:
      i % 2 === 0
        ? blob(
            stone.x - stone.rx * 0.35,
            stone.y - stone.ry * 0.6,
            stone.rx * 0.32,
            stone.ry * 0.22,
            0.3,
            7,
            rand(),
          )
        : "",
  }));

  // lily pads
  const pads = layout.pads.map(([x, y, radius]) => {
    const rotation = rand() * Math.PI * 2;
    const leftAngle = rotation - 0.22;
    const rightAngle = rotation + 0.22;
    const ray = (angle: number, reach: number) =>
      `M0 0 L${round1(Math.cos(angle) * radius * reach)} ${round1(Math.sin(angle) * radius * reach)}`;
    return {
      x,
      y,
      d:
        `M0 0 L${round1(Math.cos(leftAngle) * radius)} ${round1(Math.sin(leftAngle) * radius)}` +
        ` A${radius} ${round1(radius * 0.86)} 0 1 0 ${round1(Math.cos(rightAngle) * radius)} ${round1(Math.sin(rightAngle) * radius)} Z`,
      vein: [ray(rotation + Math.PI, 0.8), ray(rotation + 2.2, 0.7), ray(rotation - 2.2, 0.7)].join(
        " ",
      ),
    };
  });

  return { bank, edge, lines, calm, stones, pads };
}
