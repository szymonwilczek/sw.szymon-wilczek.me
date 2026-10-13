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
  moon: { x: number; y: number; r: number; rabbit: string };
  ground: string;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

export function makeField(tall: boolean): Field {
  let seed = 23;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const jitter = (amount: number) => (rand() - 0.5) * 2 * amount;

  function blob(
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
    rough: number,
    corners = 9,
    rotation = 0,
  ) {
    const points: Point[] = [];
    for (let i = 0; i < corners; i++) {
      const angle = rotation + (i / corners) * Math.PI * 2;
      const wobble = 1 + jitter(rough);
      points.push([
        centerX + Math.cos(angle) * radiusX * wobble,
        centerY + Math.sin(angle) * radiusY * wobble,
      ]);
    }
    return smooth(points, true);
  }

  const width = tall ? 400 : 1000;
  const height = tall ? 340 : 280;
  const groundY = height - 14;
  const blades: Blade[] = [];
  const count = tall ? 90 : 180;
  for (let bladeIndex = 0; bladeIndex < count; bladeIndex++) {
    blades.push({
      x: ((bladeIndex + 0.5) / count) * width + jitter((width / count) * 0.9),
      y: groundY + jitter(2.5),
      L: height * 0.28 + rand() * height * 0.52,
      lean: jitter(0.18) + 0.04,
      w: round1(0.7 + rand() * 0.9),
      o: round1(0.45 + rand() * 0.45),
      plume: rand() < 0.32,
      side: rand() < 0.5 ? -1 : 1,
    });
  }

  const moonX = width * (tall ? 0.72 : 0.8);
  const moonY = height * (tall ? 0.2 : 0.25);
  const moon = {
    x: round1(moonX),
    y: round1(moonY),
    r: tall ? 40 : 38,
    rabbit: [
      blob(moonX + 6, moonY + 7, 11, 9, 0.08, 9, 0.4),
      blob(moonX - 5, moonY - 3, 6.5, 5.5, 0.08, 8, 0.2),
      smooth(
        [
          [moonX - 3, moonY - 7],
          [moonX + 2, moonY - 19],
          [moonX + 8, moonY - 24],
          [moonX + 6, moonY - 17],
          [moonX + 1, moonY - 6],
        ],
        true,
      ),
      blob(moonX - 16, moonY + 15, 7, 4.5, 0.1, 8, 0),
      `M${round1(moonX - 4)} ${round1(moonY + 4)} L ${round1(moonX - 15)} ${round1(moonY + 9)}`,
    ].join(" "),
  };

  const groundPoints: Point[] = [];
  for (let x = -4; x <= width + 4; x += 25) groundPoints.push([x, groundY + jitter(1.6)]);

  return { W: width, H: height, gy: groundY, blades, moon, ground: smooth(groundPoints, false) };
}

/** A blade bent by `th` from its lean, and the plume at its tip if it has one */
export function bladePath(blade: Blade, bend: number): { d: string; plume: string } {
  const angle = blade.lean + bend;
  const midAngle = blade.lean * 0.5 + bend * 0.45;
  const controlX = blade.x + Math.sin(midAngle) * blade.L * 0.55;
  const controlY = blade.y - Math.cos(midAngle) * blade.L * 0.55;
  const tipX = blade.x + Math.sin(angle) * blade.L;
  const tipY = blade.y - Math.cos(angle) * blade.L * 0.97;
  const path = `M${round1(blade.x)} ${round1(blade.y)} Q${round1(controlX)} ${round1(controlY)} ${round1(tipX)} ${round1(tipY)}`;
  if (!blade.plume) return { d: path, plume: "" };
  let plume = "";
  for (let tuft = 0; tuft < 7; tuft++) {
    const along = 0.6 + tuft * 0.06;
    const stemX =
      (1 - along) * (1 - along) * blade.x +
      2 * (1 - along) * along * controlX +
      along * along * tipX;
    const stemY =
      (1 - along) * (1 - along) * blade.y +
      2 * (1 - along) * along * controlY +
      along * along * tipY;
    const tuftAngle = angle + (tuft % 2 ? 1 : -1) * blade.side * (0.5 - tuft * 0.04) + 0.25;
    const length = 9 + tuft * 1.6;
    plume +=
      `M${round1(stemX)} ${round1(stemY)} q${round1(Math.sin(tuftAngle) * length * 0.6)} ${round1(-Math.cos(tuftAngle) * length * 0.6)}` +
      ` ${round1(Math.sin(tuftAngle + 0.4) * length)} ${round1(-Math.cos(tuftAngle + 0.4) * length * 0.8)} `;
  }
  return { d: path, plume };
}
