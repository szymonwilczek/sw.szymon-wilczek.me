// the sekimori stone

import { mix, roundCoord, smooth } from "./core.js";
import {
  jitter,
  wobblyPolygon,
  wobblyBox,
  wobblyLine,
  wobblySegment,
  wobblyRing,
  newGroup,
  addLine,
  addSolid,
} from "./pen.js";
import { stone } from "./garden.js";

// flat stone on the path, a rope crossed over it, a small wooden box hanging at the front
function stoneBody(group, rand, x, y, scale, tones) {
  const points = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2,
      sin = Math.sin(angle),
      cos = Math.cos(angle);
    const rx = 13 * scale * (1 + jitter(rand, 0.08)),
      rise = 9 * scale * (0.9 + 0.2 * rand());
    points.push([
      x + cos * rx + (sin < 0 ? -cos * cos * 1.2 * scale : 0),
      sin < 0 ? y + sin * rise * (1 - 0.15 * cos) : y + sin * 3.5 * scale,
    ]);
  }
  const outline = smooth(points, true);
  addSolid(
    group,
    wobblyRing(rand, x + 3 * scale, y + 2.5 * scale, 14 * scale, 3.4 * scale, 0.6, 10),
    tones.ink,
    0.22,
    "url(#bk-bleed)",
  );
  addSolid(group, outline, mix(tones.stone, tones.paper, 0.5), 1);
  addSolid(
    group,
    `M${roundCoord(x - 12 * scale)} ${roundCoord(y - 1 * scale)} Q${roundCoord(x)} ${roundCoord(y + 2 * scale)} ${roundCoord(x + 12 * scale)} ${roundCoord(y - 2 * scale)} Q${roundCoord(x + 10 * scale)} ${roundCoord(y + 3 * scale)} ${roundCoord(x)} ${roundCoord(y + 3.4 * scale)} Q${roundCoord(x - 10 * scale)} ${roundCoord(y + 3 * scale)} ${roundCoord(x - 12 * scale)} ${roundCoord(y - 1 * scale)} Z`,
    tones.stone,
    0.55,
  );
  addLine(group, outline, tones.ink, 1.3, 0.9);
  return outline;
}

function sekiStone(groups, rand, x, y, scale, tones, open) {
  const group = newGroup(),
    scaled = (v) => v * scale;
  if (!open) {
    stone(group, rand, x + scaled(2), y + scaled(3), scaled(24), scaled(9), tones);
    groups.push(group);
    const tied = newGroup();
    stoneBody(tied, rand, x, y, scale, tones);
    const rope = (points) => {
      addLine(tied, wobblyLine(rand, points, 0.2), tones.ink, scaled(2), 0.95, true);
      addLine(tied, wobblyLine(rand, points, 0.15), tones.cord, scaled(0.8), 0.9, true);
    };
    rope([
      [x - scaled(12.5), y + scaled(1)],
      [x - scaled(9), y - scaled(5.5)],
      [x - scaled(1), y - scaled(8.6)],
      [x + scaled(7), y - scaled(6.4)],
      [x + scaled(12.5), y],
    ]);
    rope([
      [x + scaled(1.6), y + scaled(3.4)],
      [x + scaled(1), y - scaled(3)],
      [x - scaled(1), y - scaled(8.6)],
    ]);
    [-1, 1].forEach((side) =>
      addLine(
        tied,
        wobblyLine(
          rand,
          [
            [x - scaled(1), y - scaled(9)],
            [x + side * scaled(4.5), y - scaled(13)],
            [x + side * scaled(7), y - scaled(11)],
            [x + side * scaled(3), y - scaled(9)],
          ],
          0.15,
        ),
        tones.ink,
        scaled(1.3),
        0.9,
        true,
      ),
    );
    addSolid(
      tied,
      wobblyRing(rand, x - scaled(1), y - scaled(9), scaled(1.8), scaled(1.5), 0.15, 6),
      tones.ink,
      0.95,
    );
    groups.push(tied);
    const box = newGroup(),
      boxX = x + scaled(2.4),
      boxY = y + scaled(2.4);
    addLine(
      box,
      wobblyLine(
        rand,
        [
          [x + scaled(1.6), y + scaled(2.6)],
          [boxX, boxY + scaled(2)],
        ],
        0.1,
      ),
      tones.ink,
      scaled(1.2),
      0.9,
      true,
    );
    addSolid(
      box,
      wobblyBox(
        rand,
        boxX - scaled(5.5),
        boxY + scaled(2),
        boxX + scaled(5.5),
        boxY + scaled(13),
        0.3,
      ),
      tones.wood,
      1,
    );
    addLine(
      box,
      wobblyBox(
        rand,
        boxX - scaled(5.5),
        boxY + scaled(2),
        boxX + scaled(5.5),
        boxY + scaled(13),
        0.3,
      ),
      tones.ink,
      1.1,
      0.95,
    );
    addLine(
      box,
      wobblySegment(
        rand,
        [boxX - scaled(5.5), boxY + scaled(4.6)],
        [boxX + scaled(5.5), boxY + scaled(4.6)],
        0.2,
        1,
      ),
      tones.ink,
      0.7,
      0.6,
    );
    addSolid(
      box,
      wobblyBox(
        rand,
        boxX - scaled(2.6),
        boxY + scaled(6.4),
        boxX + scaled(2.6),
        boxY + scaled(11.4),
        0.2,
      ),
      tones.brass,
      1,
    );
    addSolid(
      box,
      `${wobblyRing(rand, boxX, boxY + scaled(8.2), scaled(1), scaled(1), 0.1, 6)} ${wobblyBox(rand, boxX - scaled(0.4), boxY + scaled(8.2), boxX + scaled(0.4), boxY + scaled(10.6), 0.1)}`,
      tones.deep,
      0.95,
    );
    groups.push(box);
  } else {
    stone(group, rand, x + scaled(2), y + scaled(3), scaled(24), scaled(9), tones);
    const rope = [
      [x - scaled(18), y + scaled(4)],
      [x - scaled(9), y + scaled(8)],
      [x + scaled(3), y + scaled(7)],
      [x + scaled(10), y + scaled(2)],
      [x + scaled(4), y - scaled(1)],
      [x - scaled(8), y + scaled(1)],
    ];
    addLine(group, wobblyLine(rand, rope, 0.3), tones.ink, scaled(2.6), 0.9, true);
    addLine(group, wobblyLine(rand, rope, 0.2), tones.cord, scaled(1), 0.85, true);
    stoneBody(group, rand, x + scaled(30), y + scaled(9), scale, tones);
    groups.push(group);
    const box = newGroup(),
      boxX = x - scaled(14),
      boxY = y + scaled(10);
    addSolid(
      box,
      wobblyBox(rand, boxX - scaled(6), boxY - scaled(4), boxX + scaled(6), boxY + scaled(5), 0.3),
      tones.wood,
      1,
    );
    addSolid(
      box,
      wobblyBox(
        rand,
        boxX - scaled(4.6),
        boxY - scaled(3),
        boxX + scaled(4.6),
        boxY - scaled(0.5),
        0.2,
      ),
      tones.deep,
      0.9,
    );
    addLine(
      box,
      wobblyBox(rand, boxX - scaled(6), boxY - scaled(4), boxX + scaled(6), boxY + scaled(5), 0.3),
      tones.ink,
      1.1,
      0.95,
    );
    const lid = wobblyPolygon(
      rand,
      [
        [boxX - scaled(6), boxY - scaled(4)],
        [boxX + scaled(6), boxY - scaled(4)],
        [boxX + scaled(8), boxY - scaled(9)],
        [boxX - scaled(3), boxY - scaled(10)],
      ],
      0.3,
    );
    addSolid(box, lid, tones.woodLt, 1);
    addLine(box, lid, tones.ink, 1, 0.9);
    groups.push(box);
  }
}

export { stoneBody, sekiStone };
