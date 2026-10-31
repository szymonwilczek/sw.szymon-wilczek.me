// what stands about the garden: stones, maple, thatch

import { lerp } from "./core.js";
import { wobblyLine, wobblySegment, wobblyRing, addWash, addLine, addSolid } from "./pen.js";

function stone(group, rand, cx, cy, rx, ry, tones, opacity) {
  const outline = wobblyRing(rand, cx, cy, rx, ry, Math.min(rx, ry) * 0.12, 10);
  addWash(group, rand, outline, tones.stone, opacity ?? 0.95);
  addWash(
    group,
    rand,
    wobblyRing(rand, cx + rx * 0.15, cy + ry * 0.3, rx * 0.75, ry * 0.5, 0.6, 8),
    tones.stoneDk,
    0.4,
    "url(#bk-bleed)",
  );
  const top = [];
  for (let i = 0; i <= 6; i++) {
    const angle = Math.PI * (1.05 + (i / 6) * 0.95);
    top.push([cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]);
  }
  addLine(group, wobblyLine(rand, top, 0.6), tones.ink, 1.2, 0.8);
}

function steppingStones(group, rand, points, tones, size) {
  points.forEach(([x, y], i) => {
    const scale = (size || 1) * (0.85 + rand() * 0.35);
    stone(group, rand, x, y, 22 * scale, 9 * scale, tones);
  });
}

function maple(group, rand, cx, cy, radius, count, tones) {
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2,
      distance = Math.sqrt(rand()) * radius,
      x = cx + Math.cos(angle) * distance,
      y = cy + Math.sin(angle) * distance * 0.6;
    addSolid(
      group,
      wobblyRing(rand, x, y, 2.4 + rand() * 3, 2 + rand() * 2.4, 0.5, 6),
      rand() < 0.25 ? tones.redWarmer || tones.maple : tones.maple,
      0.4 + rand() * 0.45,
      "url(#bk-bleed)",
    );
  }
}

function thatchStrokes(group, rand, ridgeFrom, ridgeTo, eaveFrom, eaveTo, count, tones) {
  // strokes run from the ridge edge
  for (let i = 0; i < count; i++) {
    const along = (i + rand() * 0.8) / count,
      ridgePoint = [lerp(ridgeFrom[0], ridgeTo[0], along), lerp(ridgeFrom[1], ridgeTo[1], along)],
      eavePoint = [lerp(eaveFrom[0], eaveTo[0], along), lerp(eaveFrom[1], eaveTo[1], along)];
    const start = rand() * 0.3,
      end = 0.55 + rand() * 0.45;
    addLine(
      group,
      wobblySegment(
        rand,
        [lerp(ridgePoint[0], eavePoint[0], start), lerp(ridgePoint[1], eavePoint[1], start)],
        [lerp(ridgePoint[0], eavePoint[0], end), lerp(ridgePoint[1], eavePoint[1], end)],
        0.6,
        2,
      ),
      i % 3 ? tones.thatchDk : tones.ink,
      0.7,
      0.35 + rand() * 0.3,
      true,
    );
  }
}

export { stone, steppingStones, maple, thatchStrokes };
