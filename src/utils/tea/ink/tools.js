// the potter's tools: wheel, fingers, buckets, brush

import { roundCoord, lerp } from "./core.js";
import {
  wobblyPolygon,
  wobblyBox,
  wobblyLine,
  wobblySegment,
  wobblyRing,
  addWash,
  addLine,
  addSolid,
  addText,
  brushStroke,
} from "./pen.js";
import { piece } from "./ceramics.js";

// kick wheel
function wheel(group, rand, cx, cy, scale, tones) {
  const scaled = (v) => v * scale;
  addSolid(
    group,
    wobblyRing(rand, cx + scaled(6), cy + scaled(74), scaled(78), scaled(14), 0.5, 14),
    tones.ink,
    0.14,
  );
  const arc = (centerY, radiusX, radiusY, from, to, wobble) =>
    wobblyLine(
      rand,
      Array.from({ length: 13 }, (_, i) => {
        const angle = lerp(from, to, i / 12);
        return [cx + Math.cos(angle) * radiusX, centerY + Math.sin(angle) * radiusY];
      }),
      wobble * 0.4,
    );
  // both upright edges in one path, so the tremble filter has a box wide enough to draw them
  const sides = (halfWidth, top, bottom, wobble, steps) =>
    [-1, 1]
      .map((side) =>
        wobblySegment(
          rand,
          [cx + side * halfWidth, top],
          [cx + side * halfWidth, bottom],
          wobble,
          steps,
        ),
      )
      .join(" ");
  // a disc seen from above: its rim is the side of a short cylinder
  const disc = (top, radiusX, radiusY, thickness, wobble, fill) => {
    const bottom = top + thickness;
    addSolid(group, wobblyBox(rand, cx - radiusX, top, cx + radiusX, bottom, 0), tones.woodDk, 1);
    addSolid(group, wobblyRing(rand, cx, bottom, radiusX, radiusY, 0, 18), tones.woodDk, 1);
    addLine(group, arc(bottom, radiusX, radiusY, 0, Math.PI, wobble), tones.ink, 1, 0.8);
    addLine(group, sides(radiusX, top, bottom, 0.2, 1), tones.ink, 1, 0.8);
    const face = wobblyRing(rand, cx, top, radiusX, radiusY, wobble, 18);
    addSolid(group, face, fill, 1);
    return face;
  };
  const flywheelTop = cy + scaled(62);
  disc(flywheelTop, scaled(70), scaled(18), scaled(8), 0.5, tones.wood);
  // the far edge breaks where the shaft stands in front of it
  const behindShaft = Math.asin(6 / 70);
  for (const [from, to] of [
    [0, Math.PI],
    [Math.PI, 1.5 * Math.PI - behindShaft],
    [1.5 * Math.PI + behindShaft, 2 * Math.PI],
  ])
    addLine(group, arc(flywheelTop, scaled(70), scaled(18), from, to, 0.5), tones.ink, 1.2, 0.9);
  // the shaft stands on the flywheel and runs up under the head
  addSolid(
    group,
    wobblyBox(rand, cx - scaled(5), cy + scaled(4), cx + scaled(5), cy + scaled(62), 0),
    tones.woodDk,
    1,
  );
  addLine(group, sides(scaled(5), cy + scaled(19), cy + scaled(62), 0.3, 3), tones.ink, 1, 0.85);
  const head = disc(cy, scaled(46), scaled(13), scaled(7), 0.3, tones.woodLt);
  addLine(group, head, tones.ink, 1.2, 0.95);
  addLine(group, wobblyRing(rand, cx, cy, scaled(30), scaled(8.5), 0.3, 16), tones.ink, 0.6, 0.4);
}

// spin mark round the wheel head
function spin(group, rand, cx, cy, rx, ry, tones) {
  const points = Array.from({ length: 12 }, (_, i) => {
    const angle = Math.PI * (0.15 + (i / 11) * 0.7);
    return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
  });
  addLine(group, wobblyLine(rand, points, 0.3), tones.ink, 1, 0.45);
  const start = points[0];
  addLine(
    group,
    `M${roundCoord(start[0] + 6)} ${roundCoord(start[1] - 6)} L${roundCoord(start[0])} ${roundCoord(start[1])} L${roundCoord(start[0] + 9)} ${roundCoord(start[1] + 2)}`,
    tones.ink,
    1,
    0.5,
  );
}

// lump of clay at some stage of the throw
function wetClay(group, rand, cx, cy, s, tones, profile, height) {
  piece(group, rand, cx, cy, s, tones, {
    prof: profile,
    H: height,
    clay: 0,
    glaze: { none: true },
    fire: 3,
  });
}

function fingertip(group, rand, x, y, tones, label) {
  addLine(group, wobblyRing(rand, x, y, 11, 11, 0.4, 12), tones.ink, 1, 0.6);
  addWash(group, rand, wobblyRing(rand, x, y, 14, 14, 1, 12), tones.gold, 0.35, "url(#bk-bleed)");
  if (label)
    addText(group, {
      t: label,
      tr: `translate(${roundCoord(x)} ${roundCoord(y - 20)})`,
      fs: 13,
      font: "Kalam, cursive",
      fill: tones.ink,
      o: 0.6,
    });
}

function arrowLine(group, rand, points, tones, opacity) {
  brushStroke(group, rand, points, 2, tones.ink, opacity ?? 0.55, { tip: 0.05, head: 0.1 });
  const prev = points[points.length - 2],
    tip = points[points.length - 1],
    angle = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
  const barb = (splay) => [
    tip[0] - 9 * Math.cos(angle + splay),
    tip[1] - 9 * Math.sin(angle + splay),
  ];
  addLine(
    group,
    `M${roundCoord(barb(0.5)[0])} ${roundCoord(barb(0.5)[1])} L${roundCoord(tip[0])} ${roundCoord(tip[1])} L${roundCoord(barb(-0.5)[0])} ${roundCoord(barb(-0.5)[1])}`,
    tones.ink,
    1.3,
    opacity ?? 0.55,
  );
}

// glaze bucket, seen a little from above
function bucket(group, rand, cx, cy, scale, tones, glaze, label) {
  const scaled = (v) => v * scale;
  addSolid(
    group,
    wobblyRing(rand, cx + scaled(3), cy + scaled(4), scaled(30), scaled(8), 0.3, 10),
    tones.ink,
    0.15,
  );
  const outline = wobblyPolygon(
    rand,
    [
      [cx - scaled(30), cy - scaled(36)],
      [cx - scaled(26), cy],
      [cx + scaled(26), cy],
      [cx + scaled(30), cy - scaled(36)],
    ],
    0.4,
  );
  addSolid(group, outline, tones.wood, 1);
  addLine(group, outline.slice(0, outline.lastIndexOf(" Q")), tones.ink, 1.1, 0.9);
  [0.3, 0.75].forEach((band) =>
    addLine(
      group,
      wobblyLine(
        rand,
        [
          [cx - scaled(30 - 4 * band), cy - scaled(36 * (1 - band))],
          [cx, cy - scaled(36 * (1 - band)) + scaled(4)],
          [cx + scaled(30 - 4 * band), cy - scaled(36 * (1 - band))],
        ],
        0.2,
      ),
      tones.rope,
      2,
      0.9,
      true,
    ),
  );
  const rim = wobblyRing(rand, cx, cy - scaled(36), scaled(30), scaled(8), 0.2, 14);
  addSolid(group, rim, tones.woodDk, 1);
  addSolid(
    group,
    wobblyRing(rand, cx, cy - scaled(35), scaled(27), scaled(6.5), 0.2, 14),
    glaze,
    1,
  );
  addLine(group, rim, tones.ink, 1.1, 0.9);
  if (label)
    addText(group, {
      t: label,
      tr: `translate(${roundCoord(cx)} ${roundCoord(cy + scaled(20))})`,
      fs: 12,
      font: "Kalam, cursive",
      fill: tones.ink,
      o: 0.6,
    });
}

// brush, held at an angle
function brushTool(group, rand, x, y, angle, length, tones, ink) {
  const dirX = Math.cos(angle),
    dirY = Math.sin(angle),
    end = [x + dirX * length, y + dirY * length],
    ferrule = [x + dirX * length * 0.18, y + dirY * length * 0.18];
  brushStroke(group, rand, [ferrule, end], length / 30, tones.bamboo, 0.95, {
    blunt: true,
    tip: 0.9,
  });
  addLine(group, wobblyLine(rand, [ferrule, end], 0.2), tones.ink, 0.7, 0.5);
  brushStroke(group, rand, [[x, y], ferrule], length / 21, ink || tones.ink, 0.95, {
    tip: 0.05,
    head: 0.9,
  });
}

export { wheel, spin, wetClay, fingertip, arrowLine, bucket, brushTool };
