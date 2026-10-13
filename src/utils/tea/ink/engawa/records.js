// the record player and its sleeves

import { SCENE_WIDTH, mix, hash, rng } from "../core.js";
import {
  wobblyPolygon,
  wobblyBox,
  wobblyLine,
  wobblyRing,
  newGroup,
  addWash,
  addLine,
  addSolid,
  addText,
  inked,
  quadMap,
} from "../pen.js";
import { ENGAWA_HEIGHT, STARLIGHT } from "./sky.js";
import { slab } from "./terrace.js";

function recordPlayer(group, rand, x, y, scale, tones, light, disc = 0) {
  const scaled = (v) => v * scale,
    at = (dx, dy) => [x + scaled(dx), y + scaled(dy)];
  addWash(
    group,
    rand,
    wobblyRing(rand, x + scaled(10), y + scaled(22), scaled(98), scaled(14), 1, 10),
    tones.pool,
    0.8,
    "url(#bk-pool)",
  );
  inked(
    group,
    rand,
    wobblyPolygon(rand, [at(-78, -60), at(66, -80), at(70, -10), at(-74, 8)], 0.8),
    tones.cloth,
    tones.ink,
    1.3,
  );
  addLine(
    group,
    wobblyPolygon(rand, [at(-68, -50), at(58, -68), at(61, -14), at(-65, 0)], 0.6),
    tones.ink,
    0.8,
    0.5,
  );
  inked(
    group,
    rand,
    wobblyPolygon(rand, [at(-86, 4), at(74, -14), at(96, 6), at(-66, 28)], 0.8),
    tones.woodLt,
    tones.ink,
    1.3,
  );
  inked(
    group,
    rand,
    wobblyPolygon(rand, [at(-66, 28), at(96, 6), at(96, 18), at(-66, 41)], 0.6),
    tones.woodDk,
    tones.ink,
    1.2,
  );
  inked(
    group,
    rand,
    wobblyRing(rand, x - scaled(4), y + scaled(9), scaled(56), scaled(13), 0.6, 16),
    tones.iron,
    tones.ink,
    1.1,
  );
  addSolid(
    group,
    wobblyRing(rand, x - scaled(4), y + scaled(8), scaled(51), scaled(11.5), 0.4, 16),
    mix(tones.ink, "#000000", 0.3),
    0.95,
  );
  for (let k = 1; k < 4; k++)
    addLine(
      group,
      wobblyRing(
        rand,
        x - scaled(4),
        y + scaled(8),
        scaled(51 - k * 9),
        scaled(11.5 - k * 2),
        0.2,
        14,
      ),
      mix(tones.ink, STARLIGHT, 0.35),
      0.5,
      0.45,
      true,
    );
  addSolid(
    group,
    wobblyRing(rand, x - scaled(4), y + scaled(8), scaled(13), scaled(3.2), 0.2, 10),
    tones[DISC_LOOK[disc][1]],
    0.95,
  );
  addSolid(
    group,
    wobblyRing(rand, x - scaled(4), y + scaled(8), scaled(1.4), scaled(0.6), 0.1, 6),
    tones.ink,
    1,
  );
  addLine(
    group,
    wobblyLine(rand, [at(70, -2), at(66, 6), at(40, 9), at(16, 10)], 0.3),
    tones.ink,
    scaled(2.4),
    0.95,
    true,
  );
  inked(
    group,
    rand,
    wobblyRing(rand, x + scaled(70), y - scaled(2), scaled(6), scaled(3), 0.2, 8),
    tones.iron,
    tones.ink,
    1,
  );
  inked(
    group,
    rand,
    wobblyBox(rand, x + scaled(10), y + scaled(7), x + scaled(18), y + scaled(12), 0.2),
    tones.iron,
    tones.ink,
    0.8,
  );
}

// records in the crate, in the order the house radio keeps them (discs.ts)
const DISC_LOOK = [
  ["cloth", "gold"],
  ["red", "red"],
  ["paper", "paper"],
  ["glowSoft", "glowSoft"],
  ["fusuma", "fusuma"],
];

// a sleeve, standing or lying; each record has a face of its own
function sleeve(group, rand, points, tones, disc) {
  const mapQuad = quadMap(...points),
    outline = wobblyPolygon(rand, points, 0.6),
    fill = tones[DISC_LOOK[disc][0]],
    at = (u, v) => mapQuad(u, v);
  addSolid(group, outline, mix(fill, tones.paper, 0.15), 1);
  addWash(group, rand, outline, fill, 0.5);
  if (disc === 0) {
    addSolid(group, wobblyRing(rand, ...at(0.62, 0.36), 9, 9, 0.5, 10), tones.gold, 0.95);
    addLine(
      group,
      wobblyLine(rand, [at(0.12, 0.78), at(0.5, 0.74), at(0.88, 0.79)], 0.5),
      tones.paper,
      0.9,
      0.6,
    );
  } else if (disc === 1) {
    for (let k = 0; k < 4; k++)
      addLine(
        group,
        wobblyLine(rand, [at(0.1, 0.2 + k * 0.17), at(0.9, 0.18 + k * 0.17)], 0.5),
        tones.paper,
        1.4,
        0.55,
        true,
      );
  } else if (disc === 2) {
    addLine(
      group,
      wobblyLine(rand, [at(0.2, 0.75), at(0.4, 0.3), at(0.55, 0.62), at(0.8, 0.22)], 0.8),
      tones.ink,
      2.4,
      0.85,
    );
  } else if (disc === 3) {
    addSolid(
      group,
      wobblyPolygon(rand, [at(0, 0.5), at(1, 0.5), at(1, 1), at(0, 1)], 0.3),
      tones.cloth,
      0.55,
    );
    addSolid(group, wobblyRing(rand, ...at(0.5, 0.48), 10, 10, 0.4, 12), tones.red, 0.85);
    for (let k = 0; k < 3; k++)
      addLine(
        group,
        wobblyLine(rand, [at(0.08, 0.6 + k * 0.1), at(0.92, 0.6 + k * 0.1)], 0.3),
        tones.paper,
        0.9,
        0.6,
        true,
      );
    addLine(
      group,
      wobblyLine(rand, [at(0.12, 1), at(0.2, 0.55), at(0.26, 0.25)], 0.4),
      tones.ink,
      1.4,
      0.9,
    );
    addLine(
      group,
      `M${at(0.26, 0.25)} Q${at(0.4, 0.15)} ${at(0.5, 0.28)} M${at(0.26, 0.25)} Q${at(0.12, 0.12)} ${at(0.02, 0.3)}`,
      tones.ink,
      1.2,
      0.9,
      true,
    );
  } else {
    addLine(
      group,
      wobblyPolygon(rand, [at(0.12, 0.14), at(0.88, 0.14), at(0.88, 0.5), at(0.12, 0.5)], 0.4),
      tones.ink,
      0.8,
      0.7,
    );
    for (let k = 0; k < 3; k++)
      addLine(
        group,
        wobblyLine(rand, [at(0.2, 0.24 + k * 0.08), at(0.8 - k * 0.1, 0.24 + k * 0.08)], 0.2),
        tones.ink,
        1.1,
        0.75,
        true,
      );
    addLine(
      group,
      wobblyLine(rand, [at(0.15, 0.85), at(0.6, 0.85)], 0.2),
      tones.ink,
      0.8,
      0.6,
      true,
    );
    addSolid(group, wobblyRing(rand, ...at(0.75, 0.75), 5, 5, 0.3, 8), tones.red, 0.85);
  }
  addLine(group, outline, tones.ink, 1.1);
}

// wooden crate of records at the far left of the boards
const inCrate = (slot) => {
  const x = 28 + slot * 5,
    y = 552 - slot * 13;
  return [
    [x, y],
    [x + 78, y - 4],
    [x + 80, y + 58],
    [x + 2, y + 62],
  ];
};

function crateSleeve(tones, slot) {
  const group = newGroup();
  const rand = rng(hash("terrace/engawa/crate/" + slot));
  sleeve(group, rand, inCrate(slot), tones, slot);
  const [[x, y]] = inCrate(slot);
  return { W: SCENE_WIDTH, H: ENGAWA_HEIGHT, groups: [group], clips: [], from: [x + 40, y + 30] };
}

function crate(groups, rand, tones, disc, lifted) {
  const back = newGroup(),
    x0 = 18,
    x1 = 118,
    y0 = 566,
    y1 = 628;
  groups.push(back);
  addWash(back, rand, wobblyRing(rand, 72, 634, 70, 10, 1, 10), tones.pool, 0.8, "url(#bk-pool)");
  slab(
    back,
    rand,
    wobblyPolygon(
      rand,
      [
        [x0 + 10, y0 - 12],
        [x1 + 8, y0 - 18],
        [x1 + 4, y0 + 6],
        [x0 + 6, y0 + 10],
      ],
      0.5,
    ),
    tones.woodDk,
    tones,
    1.1,
  );
  for (let slot = DISC_LOOK.length - 1; slot >= 0; slot--) {
    const group = newGroup({ op: slot === disc || slot === lifted ? 0.18 : 1 });
    groups.push(group);
    sleeve(group, rand, inCrate(slot), tones, slot);
  }
  const crateGroup = newGroup();
  groups.push(crateGroup);
  const front = wobblyPolygon(
    rand,
    [
      [x0, y0 + 4],
      [x1, y0 - 2],
      [x1 + 2, y1 - 4],
      [x0 + 2, y1],
    ],
    0.5,
  );
  slab(crateGroup, rand, front, tones.wood, tones, 1.3);
  slab(
    crateGroup,
    rand,
    wobblyPolygon(
      rand,
      [
        [x1, y0 - 2],
        [x1 + 8, y0 - 18],
        [x1 + 10, y1 - 20],
        [x1 + 2, y1 - 4],
      ],
      0.5,
    ),
    tones.woodDk,
    tones,
    1.1,
  );
  addLine(
    crateGroup,
    wobblyLine(
      rand,
      [
        [x0 + 1, y0 + 24],
        [x1 + 1, y0 + 19],
      ],
      0.4,
    ),
    tones.woodDk,
    0.9,
    0.6,
  );
  addLine(
    crateGroup,
    wobblyLine(
      rand,
      [
        [x0 + 1, y0 + 44],
        [x1 + 2, y0 + 39],
      ],
      0.4,
    ),
    tones.woodDk,
    0.9,
    0.6,
  );
  addSolid(crateGroup, wobblyRing(rand, (x0 + x1) / 2, y0 + 12, 12, 3.2, 0.3, 10), tones.ink, 0.8);
  addText(crateGroup, {
    t: "盤",
    tr: `translate(${x0 + 14} ${y1 - 12}) rotate(-3)`,
    fs: 10,
    font: "'Yuji Syuku', serif",
    fill: tones.red,
  });
}

export { recordPlayer, DISC_LOOK, sleeve, crateSleeve, crate };
