import { hash, rng } from "./stamp";

const round1 = (value: number) => Math.round(value * 10) / 10;

export function blob(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  seed: string,
  corners = 9,
) {
  const rand = rng(hash(seed));
  const points: [number, number][] = [];
  for (let i = 0; i < corners; i++) {
    const angle = (i / corners) * Math.PI * 2 + (rand() - 0.5) * 0.3;
    const wobble = 0.86 + rand() * 0.2;
    const sine = Math.sin(angle);
    points.push([
      centerX + Math.cos(angle) * radiusX * wobble,
      centerY + sine * radiusY * wobble * (sine > 0 ? 1.08 : 0.92),
    ]);
  }
  const midpoint = (from: [number, number], to: [number, number]) => [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2,
  ];
  const [startX, startY] = midpoint(points[corners - 1], points[0]);
  let path = `M${round1(startX)} ${round1(startY)}`;
  for (let i = 0; i < corners; i++) {
    const [midX, midY] = midpoint(points[i], points[(i + 1) % corners]);
    path += ` Q${round1(points[i][0])} ${round1(points[i][1])} ${round1(midX)} ${round1(midY)}`;
  }
  return `${path} Z`;
}

export function tufts(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  moss: number,
  seed: string,
) {
  const rand = rng(hash(`${seed}/moss`));
  let path = "";
  for (let i = 0; i < moss * 4; i++) {
    const angle = rand() < 0.7 ? (0.15 + rand() * 0.7) * Math.PI : (1.1 + rand() * 0.8) * Math.PI;
    const x = centerX + Math.cos(angle) * radiusX * (0.85 + rand() * 0.2);
    const y = centerY + Math.sin(angle) * radiusY * (0.9 + rand() * 0.2);
    const height = 3 + rand() * 4;
    const lean = (rand() - 0.5) * 5;
    path += `M${round1(x)} ${round1(y)} q ${round1(lean / 2)} ${round1(-height / 2)} ${round1(lean)} ${round1(-height)} `;
  }
  return path.trim();
}

export function stone(centerX: number, centerY: number, scale: number, moss: number, seed: string) {
  const radiusX = 34 * scale;
  const radiusY = 15 * scale;
  return {
    shadow: {
      cx: round1(centerX + 2 * scale),
      cy: round1(centerY + 5 * scale),
      rx: round1(radiusX),
      ry: round1(radiusY * 0.9),
    },
    body: blob(centerX, centerY, radiusX, radiusY, seed),
    moss: moss
      ? blob(
          centerX - radiusX * 0.15,
          centerY + radiusY * 0.35,
          radiusX * 0.6,
          radiusY * (0.2 + (0.45 * moss) / 3),
          `${seed}/wash`,
          7,
        )
      : "",
    mossOpacity: 0.25 + 0.15 * moss,
    tufts: tufts(centerX, centerY, radiusX, radiusY, moss, seed),
  };
}
