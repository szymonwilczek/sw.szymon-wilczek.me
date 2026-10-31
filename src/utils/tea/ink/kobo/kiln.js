// the kiln step

import { mix, roundCoord } from "../core.js";
import {
  wobblyPolygon,
  wobblyBox,
  wobblyLine,
  wobblySegment,
  wobblyRing,
  addWash,
  addLine,
  addSolid,
  inked,
} from "../pen.js";
import { piece } from "../ceramics.js";

// inside one chamber of the kiln
function chamber(group, rand, cx, cy, width, height, tones, heat) {
  const flame = [
    mix(tones.red, tones.ink, 0.2),
    mix(tones.red, tones.gold, 0.4),
    tones.gold,
    mix(tones.gold, tones.paper, 0.6),
  ][heat];
  const arch = Array.from({ length: 17 }, (_, i) => {
    const angle = Math.PI * (i / 16);
    return [cx - (Math.cos(angle) * width) / 2, cy - Math.sin(angle) * height];
  });
  addSolid(
    group,
    wobblyPolygon(
      rand,
      [...arch, [cx + width / 2 + 14, cy + 12], [cx - width / 2 - 14, cy + 12]],
      0.5,
    ),
    mix(tones.earth, tones.kura, 0.35),
    1,
  );
  addSolid(group, wobblyPolygon(rand, arch, 0.4), mix(tones.deep, flame, 0.35), 1);
  addWash(
    group,
    rand,
    wobblyRing(rand, cx, cy - height * 0.35, width * 0.45, height * 0.6, 3, 12),
    flame,
    0.75,
    "url(#bk-bleed)",
  );
  addLine(group, wobblyLine(rand, arch, 0.4), tones.ink, 1.4, 0.95);
  for (let ring = 1; ring < 4; ring++)
    addLine(
      group,
      wobblyLine(
        rand,
        arch
          .map(([x, y]) => [cx + (x - cx) * (1 + ring * 0.07), cy + (y - cy) * (1 + ring * 0.08)])
          .slice(1, 16),
        0.3,
      ),
      tones.ink,
      0.6,
      0.4,
    );
  addLine(
    group,
    wobblySegment(rand, [cx - width / 2, cy], [cx + width / 2, cy], 0.4, 2),
    tones.ink,
    1.2,
    0.9,
  );
  [cy - height * 0.48].forEach((shelfY) => {
    inked(
      group,
      rand,
      wobblyBox(rand, cx - width * 0.4, shelfY, cx + width * 0.4, shelfY + 5, 0.3),
      mix(tones.earth, tones.paper, 0.2),
      tones.ink,
      0.9,
    );
    [cx - width * 0.3, cx + width * 0.3].forEach((x) =>
      addLine(
        group,
        wobblySegment(rand, [x, shelfY + 5], [x, cy], 0.3, 2),
        tones.ink,
        3,
        0.6,
        true,
      ),
    );
  });
}

function heatBar(group, rand, x, y, width, tones, current, bandFrom, bandTo) {
  const colors = [
    mix(tones.red, tones.ink, 0.2),
    mix(tones.red, tones.gold, 0.4),
    tones.gold,
    mix(tones.gold, tones.paper, 0.6),
  ];
  colors.forEach((color, i) =>
    addSolid(
      group,
      wobblyBox(rand, x + (i * width) / 4, y, x + ((i + 1) * width) / 4, y + 10, 0.2),
      color,
      0.85,
    ),
  );
  addLine(group, wobblyBox(rand, x, y, x + width, y + 10, 0.3), tones.ink, 1, 0.8);
  addLine(
    group,
    wobblyBox(rand, x + bandFrom * width, y - 4, x + bandTo * width, y + 14, 0.3),
    tones.ink,
    1.4,
    0.9,
  );
  addLine(
    group,
    `M${roundCoord(x + current * width)} ${roundCoord(y - 10)} L${roundCoord(x + current * width - 5)} ${roundCoord(y - 18)} L${roundCoord(x + current * width + 5)} ${roundCoord(y - 18)} Z`,
    tones.ink,
    1.2,
    0.9,
  );
}

// tongs holding a piece upside down by its foot
function tongs(group, rand, x, y, tones) {
  addLine(
    group,
    wobblyLine(
      rand,
      [
        [x - 6, y - 8],
        [x - 18, y - 70],
        [x - 4, y - 120],
      ],
      0.3,
    ),
    tones.iron,
    3,
    0.95,
    true,
  );
  addLine(
    group,
    wobblyLine(
      rand,
      [
        [x + 6, y - 8],
        [x + 18, y - 70],
        [x + 4, y - 120],
      ],
      0.3,
    ),
    tones.iron,
    3,
    0.95,
    true,
  );
}

export { chamber, heatBar, tongs };
