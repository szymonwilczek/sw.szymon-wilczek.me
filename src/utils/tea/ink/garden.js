// what stands about the garden: stones, maple, lantern, thatch, steam

import { lerp, smooth } from "./core.js";
import {
  jitter,
  wobblyPolygon,
  wobblyBox,
  wobblyLine,
  wobblySegment,
  wobblyRing,
  newGroup,
  addWash,
  addLine,
  addSolid,
  inked,
} from "./pen.js";

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

function lantern(group, rand, x, baseY, scale, tones, lit) {
  const scaled = (v) => v * scale;
  addWash(
    group,
    rand,
    wobblyRing(rand, x + scaled(8), baseY + scaled(3), scaled(34), scaled(7), 1, 10),
    tones.pool,
    0.7,
    "url(#bk-pool)",
  );
  inked(
    group,
    rand,
    wobblyPolygon(
      rand,
      [
        [x - scaled(20), baseY],
        [x + scaled(20), baseY],
        [x + scaled(15), baseY - scaled(10)],
        [x - scaled(15), baseY - scaled(10)],
      ],
      0.8,
    ),
    tones.stone,
    tones.ink,
    1.2,
  );
  inked(
    group,
    rand,
    wobblyBox(rand, x - scaled(6), baseY - scaled(48), x + scaled(6), baseY - scaled(10), 0.6),
    tones.stone,
    tones.ink,
    1.1,
  );
  inked(
    group,
    rand,
    wobblyPolygon(
      rand,
      [
        [x - scaled(17), baseY - scaled(48)],
        [x + scaled(17), baseY - scaled(48)],
        [x + scaled(13), baseY - scaled(56)],
        [x - scaled(13), baseY - scaled(56)],
      ],
      0.6,
    ),
    tones.stone,
    tones.ink,
    1.1,
  );
  inked(
    group,
    rand,
    wobblyBox(rand, x - scaled(13), baseY - scaled(80), x + scaled(13), baseY - scaled(56), 0.6),
    tones.stone,
    tones.ink,
    1.2,
  );
  addSolid(
    group,
    wobblyBox(rand, x - scaled(7), baseY - scaled(76), x + scaled(7), baseY - scaled(60), 0.4),
    lit ? tones.glow : tones.deep,
    lit ? 0.9 : 0.85,
  );
  if (lit)
    addWash(
      group,
      rand,
      wobblyRing(rand, x, baseY - scaled(68), scaled(22), scaled(18), 1, 10),
      tones.glowSoft,
      0.5,
      "url(#bk-pool)",
    );
  inked(
    group,
    rand,
    smooth(
      [
        [x - scaled(30), baseY - scaled(78)],
        [x - scaled(14), baseY - scaled(86)],
        [x, baseY - scaled(98)],
        [x + scaled(14), baseY - scaled(86)],
        [x + scaled(30), baseY - scaled(78)],
        [x + scaled(26), baseY - scaled(82)],
        [x, baseY - scaled(90)],
        [x - scaled(26), baseY - scaled(82)],
      ],
      true,
    ),
    tones.stone,
    tones.ink,
    1.3,
  );
  inked(
    group,
    rand,
    wobblyRing(rand, x, baseY - scaled(104), scaled(5), scaled(6), 0.4, 8),
    tones.stone,
    tones.ink,
    1,
  );
  addSolid(
    group,
    wobblyRing(rand, x - scaled(14), baseY - scaled(84), scaled(9), scaled(3), 0.6, 8),
    tones.moss,
    0.6,
    "url(#bk-bleed)",
  );
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

function cordTie(group, rand, x, y, scale, tones) {
  const scaled = (v) => v * scale;
  addLine(
    group,
    wobblyLine(
      rand,
      [
        [x - scaled(14), y - scaled(6)],
        [x - scaled(4), y],
        [x + scaled(8), y - scaled(5)],
        [x + scaled(14), y + scaled(2)],
      ],
      0.4,
    ),
    tones.ink,
    scaled(3.4),
    0.9,
    true,
  );
  addLine(
    group,
    wobblyLine(
      rand,
      [
        [x - scaled(14), y - scaled(6)],
        [x - scaled(4), y],
        [x + scaled(8), y - scaled(5)],
        [x + scaled(14), y + scaled(2)],
      ],
      0.4,
    ),
    tones.red,
    scaled(2),
    1,
    true,
  );
  [
    [-1, 1],
    [1, 1],
  ].forEach(([side]) => {
    addLine(
      group,
      wobblyLine(
        rand,
        [
          [x, y],
          [x + side * scaled(5), y + scaled(9)],
          [x + side * scaled(3), y + scaled(18)],
        ],
        0.4,
      ),
      tones.red,
      scaled(1.8),
      0.95,
      true,
    );
  });
  inked(
    group,
    rand,
    wobblyRing(rand, x, y + scaled(1), scaled(3.4), scaled(3), 0.2, 6),
    tones.red,
    tones.ink,
    0.8,
  );
}

function steam(groups, rand, x, y, tones, count) {
  for (let wisp = 0; wisp < (count || 3); wisp++) {
    const group = newGroup({
      anim: `steam ${5 + wisp * 1.3}s ease-in-out ${-wisp * 1.7}s infinite`,
      to: `${x}px ${y}px`,
      washO: 0.5,
    });
    const wispX = x + jitter(rand, 6);
    addLine(
      group,
      wobblyLine(
        rand,
        [
          [wispX, y],
          [wispX - 7, y - 18],
          [wispX + 5, y - 38],
          [wispX - 4, y - 58],
          [wispX + 6, y - 78],
        ],
        1.5,
      ),
      tones.inkSoft,
      1.6,
      0.5,
    );
    groups.push(group);
  }
}

export { stone, steppingStones, maple, lantern, thatchStrokes, cordTie, steam };
