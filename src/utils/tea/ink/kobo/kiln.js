// the kiln step

import { mix, hash, rng, roundCoord } from "../core.js";
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
} from "../pen.js";
import { GLAZES, PROFILES, piece } from "../ceramics.js";
import { fingertip, arrowLine, bucket } from "../tools.js";
import { note, frames } from "./steps.js";

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

function sceneKiln(tones) {
  const rand = rng(hash("tea/kiln")),
    width = 1100,
    height = 460,
    groups = [],
    y = 330;
  const labels = newGroup(),
    centerOf = frames(
      labels,
      rand,
      [
        ["一", "first firing"],
        ["二", "dip"],
        ["三", "drip"],
        ["四", "glaze firing"],
      ],
      tones,
      height,
    );
  groups.push(labels);
  const spec = Object.assign({ clay: 0, fire: 21 }, PROFILES.bowl);
  // bisque
  const bisque = newGroup();
  chamber(bisque, rand, centerOf(0), y, 190, 150, tones, 2);
  piece(
    bisque,
    rand,
    centerOf(0) - 34,
    y - 78,
    0.5,
    tones,
    Object.assign({}, spec, { glaze: { none: true } }),
  );
  piece(
    bisque,
    rand,
    centerOf(0) + 34,
    y - 78,
    0.5,
    tones,
    Object.assign({ clay: 3, glaze: { none: true }, fire: 2 }, PROFILES.cup),
  );
  piece(
    bisque,
    rand,
    centerOf(0),
    y - 2,
    0.62,
    tones,
    Object.assign({}, spec, { glaze: { none: true }, clay: 1 }),
  );
  heatBar(bisque, rand, centerOf(0) - 90, y + 50, 180, tones, 0.64, 0.5, 0.75);
  note(bisque, centerOf(0), y + 92, "tap to stoke · keep it in the band", tones);
  groups.push(bisque);
  // dip it upside down
  const dip = newGroup();
  bucket(dip, rand, centerOf(1), y + 30, 2.4, tones, GLAZES(tones)[3]);
  const flip = newGroup({
    tf: "rotate(180deg)",
    to: `${roundCoord(centerOf(1))}px ${roundCoord(y - 54)}px`,
  });
  piece(
    flip,
    rand,
    centerOf(1),
    y - 54,
    0.85,
    tones,
    Object.assign({}, spec, { glaze: { c: 3, dip: 0.55 } }),
  );
  groups.push(dip, flip);
  const tongsGroup = newGroup();
  tongs(tongsGroup, rand, centerOf(1), y - 112, tones);
  arrowLine(
    tongsGroup,
    rand,
    [
      [centerOf(1) + 86, y - 120],
      [centerOf(1) + 86, y - 64],
    ],
    tones,
  );
  note(tongsGroup, centerOf(1), y + 92, "drag down · let go to lift", tones);
  groups.push(tongsGroup);
  // hold it tilted and the glaze runs in drips
  const tilted = newGroup();
  piece(
    tilted,
    rand,
    centerOf(2),
    y,
    1.25,
    tones,
    Object.assign({}, spec, {
      glaze: {
        c: 2,
        dip: 0.42,
        drips: [
          [-0.4, 0.24, 0.07],
          [0.05, 0.36, 0.06],
          [0.5, 0.18, 0.08],
        ],
      },
    }),
  );
  fingertip(tilted, rand, centerOf(2) + 30, y - 120, tones);
  arrowLine(
    tilted,
    rand,
    [
      [centerOf(2) + 30, y - 100],
      [centerOf(2) + 30, y - 66],
    ],
    tones,
  );
  note(tilted, centerOf(2), y + 92, "hold where you want it to run", tones);
  groups.push(tilted);
  // same glaze, three firings
  const firings = newGroup();
  [
    [-70, 31],
    [0, 32],
    [70, 33],
  ].forEach(([offsetX, fire], i) =>
    piece(
      firings,
      rand,
      centerOf(3) + offsetX,
      y - (i === 1 ? 26 : 0),
      0.55,
      tones,
      Object.assign({}, spec, {
        fire: fire,
        glaze: { c: 0, dip: 0.6, drips: [[jitter(rng(fire), 0.6), 0.2, 0.08]] },
        kin:
          i === 2
            ? [
                [0.1, 0],
                [0.18, 0.25],
                [0.05, 0.5],
              ]
            : null,
      }),
    ),
  );
  note(firings, centerOf(3), y + 72, "the kiln decides the rest", tones);
  note(firings, centerOf(3), y + 92, "a crack is mended in gold", tones, 13, 0.55);
  groups.push(firings);
  return { W: width, H: height, groups, clips: [] };
}

export { chamber, heatBar, tongs, sceneKiln };
