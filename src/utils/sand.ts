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

const round1 = (value: number) => Math.round(value * 10) / 10;

export function smooth(points: Point[], closed: boolean): string {
  if (points.length < 2) return "";
  const padded = closed
    ? [points[points.length - 1], ...points, points[0], points[1]]
    : [points[0], ...points, points[points.length - 1]];
  let path = `M${round1(padded[1][0])} ${round1(padded[1][1])}`;
  for (let i = 1; i < padded.length - 2; i++) {
    const [before, from, to, after] = [padded[i - 1], padded[i], padded[i + 1], padded[i + 2]];
    path +=
      ` C${round1(from[0] + (to[0] - before[0]) / 6)} ${round1(from[1] + (to[1] - before[1]) / 6)}` +
      ` ${round1(to[0] - (after[0] - from[0]) / 6)} ${round1(to[1] - (after[1] - from[1]) / 6)} ${round1(to[0])} ${round1(to[1])}`;
  }
  return closed ? `${path} Z` : path;
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
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const jitter = (amount: number) => (rand() - 0.5) * 2 * amount;

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

  // passes of a rake, each a little uneven;
  // lines stop short of the stones
  const lines: Sand["lines"] = [];
  let y = 9;
  while (y < 184) {
    const pass = 3 + Math.round(rand());
    const tooth = 7.4 + jitter(0.8);
    const tilt = jitter(2.4);
    const width = 0.9 + rand() * 0.5;
    for (let stroke = 0; stroke < pass && y < 184; stroke++, y += tooth + jitter(0.7)) {
      const segs: Point[][] = [];
      const start = -6 + jitter(6);
      const end = 1006 + jitter(6);
      let segment: Point[] = [];
      for (let x = start; x <= end; x += 11 + jitter(2.5)) {
        const pointY = y + tilt * (x / 1000) + Math.sin(x / 170 + y * 0.3) * 1.1 + jitter(0.45);
        const hit = STONES.some((stone) => {
          const reach = stone.rx + stone.rings[stone.rings.length - 1] + 6 + jitter(3);
          return ((x - stone.x) / reach) ** 2 + ((pointY - stone.y) / (reach * 0.78)) ** 2 < 1;
        });
        if (hit) {
          if (segment.length > 1) segs.push(segment);
          segment = [];
          continue;
        }
        segment.push([round1(x), round1(pointY)]);
      }
      if (segment.length > 1) segs.push(segment);
      for (const run of segs)
        lines.push({ pts: run, w: round1(width + jitter(0.12)), o: round1(0.5 + rand() * 0.25) });
    }
    y += 2 + rand() * 3;
  }

  const rings: Sand["rings"] = [];
  for (const stone of STONES) {
    for (const gap of stone.rings) {
      const steps = 40;
      const shiftX = jitter(1.6);
      const shiftY = jitter(1.2);
      const points: Point[] = [];
      const startAngle = rand() * Math.PI * 2;
      const sweep = Math.PI * 2 * (0.94 + rand() * 0.1);
      for (let i = 0; i <= steps; i++) {
        const angle = startAngle + (i / steps) * sweep;
        const wobble = 1 + jitter(0.015);
        points.push([
          round1(stone.x + shiftX + Math.cos(angle) * (stone.rx + gap) * wobble),
          round1(stone.y + shiftY + Math.sin(angle) * (stone.ry + gap * 0.78) * wobble),
        ]);
      }
      rings.push({ pts: points, w: round1(0.9 + rand() * 0.5), o: round1(0.5 + rand() * 0.25) });
    }
  }

  const stones = STONES.map((stone, i) => ({
    x: stone.x,
    y: stone.y,
    rx: stone.rx,
    ry: stone.ry,
    d: blob(stone.x, stone.y, stone.rx, stone.ry, 0.12, 8 + i, rand()),
    shadow: blob(stone.x + 5, stone.y + 6, stone.rx * 1.02, stone.ry * 0.9, 0.1, 8, rand()),
    facet: smooth(
      [
        [stone.x - stone.rx * 0.5, stone.y - stone.ry * 0.2],
        [stone.x - stone.rx * 0.1, stone.y - stone.ry * 0.45],
        [stone.x + stone.rx * 0.35, stone.y - stone.ry * 0.3],
      ],
      false,
    ),
    moss:
      i === 1
        ? ""
        : blob(
            stone.x - stone.rx * 0.35,
            stone.y - stone.ry * 0.62,
            stone.rx * 0.32,
            stone.ry * 0.22,
            0.3,
            7,
            rand(),
          ),
  }));

  const grains = Array.from({ length: 70 }, () => ({
    x: round1(rand() * 1000),
    y: round1(6 + rand() * 178),
    r: round1(0.4 + rand() * 0.7),
  }));

  // ragged edge of the sand bed
  const top: Point[] = [];
  const bottom: Point[] = [];
  for (let x = 0; x <= 1000; x += 50) {
    top.push([x, 2 + jitter(2)]);
    bottom.push([1000 - x, 188 + jitter(2)]);
  }
  const edge = smooth([...top, [1003, 95], ...bottom, [-3, 95]], true);

  return { edge, grains, lines, rings, stones };
}
