// the glaze and paint steps

import { SCENE_WIDTH, mix, hash, rng } from "../core.js";
import {
  wobblyBox,
  wobblySegment,
  wobblyRing,
  newGroup,
  addLine,
  addSolid,
  addText,
  inked,
} from "../pen.js";
import { GLAZES, GLAZE_NAMES, GLAZE_KANJI, PAINTS, PROFILES, piece } from "../ceramics.js";
import { spin, bucket, brushTool } from "../tools.js";
import { note, kanji } from "./steps.js";

// glaze shelf
function sceneGlazes(tones) {
  const rand = rng(hash("tea/glazes")),
    width = SCENE_WIDTH,
    height = 300,
    group = newGroup();
  GLAZES(tones)
    .slice(0, 7)
    .forEach((color, i) => {
      const x = 110 + i * 147;
      bucket(group, rand, x, 170, 1.7, tones, color);
      note(group, x, 222, GLAZE_NAMES[i], tones, 16, 0.75);
    });
  GLAZE_KANJI.slice(0, 7).forEach((glyph, i) => kanji(group, 110 + i * 147, 250, glyph, tones, 15));
  return { W: width, H: height, groups: [group], clips: [] };
}

// painting on the banding wheel
function scenePaint(tones) {
  const rand = rng(hash("tea/paint")),
    width = SCENE_WIDTH,
    height = 620,
    groups = [],
    group = newGroup();
  const wheelX = 380,
    wheelY = 470;
  // banding wheel
  addSolid(group, wobblyRing(rand, wheelX + 6, wheelY + 38, 150, 22, 0.5, 14), tones.ink, 0.14);
  inked(
    group,
    rand,
    wobblyBox(rand, wheelX - 24, wheelY + 8, wheelX + 24, wheelY + 34, 0.4),
    tones.iron,
    tones.ink,
    1,
  );
  addSolid(
    group,
    wobblyBox(rand, wheelX - 130, wheelY, wheelX + 130, wheelY + 8, 0.4),
    mix(tones.iron, tones.ink, 0.25),
    1,
  );
  inked(
    group,
    rand,
    wobblyRing(rand, wheelX, wheelY, 130, 26, 0.4, 18),
    mix(tones.iron, tones.paper, 0.2),
    tones.ink,
    1.2,
  );
  spin(group, rand, wheelX, wheelY + 6, 150, 34, tones);
  groups.push(group);
  const bowl = newGroup();
  piece(
    bowl,
    rand,
    wheelX,
    wheelY - 12,
    3.4,
    tones,
    Object.assign(
      {
        clay: 3,
        fire: 41,
        glaze: { c: 1, dip: 0.72 },
        paint: [
          {
            pts: [
              [-0.85, 0.32],
              [-0.45, 0.22],
              [-0.05, 0.36],
              [0.35, 0.24],
              [0.7, 0.34],
            ],
            w: 3.4,
            c: 0,
          },
          {
            pts: [
              [-0.3, 0.46],
              [-0.2, 0.56],
              [-0.28, 0.66],
            ],
            w: 2.2,
            c: 0,
          },
          {
            pts: [
              [0.18, 0.44],
              [0.28, 0.54],
              [0.2, 0.66],
            ],
            w: 2.2,
            c: 0,
          },
        ],
      },
      PROFILES.bowl,
    ),
  );
  groups.push(bowl);
  const brush = newGroup();
  brushTool(brush, rand, wheelX + 134, wheelY - 128, -0.95, 150, tones, PAINTS(tones)[0]);
  note(brush, wheelX + 160, wheelY - 270, "slow is thick, fast is thin", tones);
  groups.push(brush);
  // palette: four dishes, each with its name
  const palette = newGroup(),
    names = [
      ["呉須", "gosu blue"],
      ["鬼板", "iron brown"],
      ["弁柄", "bengara red"],
      ["白化粧", "white slip"],
    ];
  PAINTS(tones)
    .slice(0, 4)
    .forEach((color, i) => {
      const x = 760 + (i % 2) * 150,
        y = 120 + Math.floor(i / 2) * 130;
      inked(palette, rand, wobblyRing(rand, x, y, 44, 14, 0.3, 14), tones.paper, tones.ink, 1.1);
      addSolid(palette, wobblyRing(rand, x - 2, y + 1, 30, 8, 0.6, 12), color, 0.95);
      kanji(palette, x, y + 40, names[i][0], tones, 15);
      note(palette, x, y + 60, names[i][1], tones, 13, 0.6);
    });
  groups.push(palette);
  // the seal for the foot, and name in hand
  const seal = newGroup(),
    sealX = 830,
    sealY = 450;
  inked(
    seal,
    rand,
    wobblyBox(rand, sealX - 18, sealY - 90, sealX + 18, sealY - 20, 0.4),
    tones.woodLt,
    tones.ink,
    1.1,
  );
  addSolid(seal, wobblyBox(rand, sealX - 22, sealY - 20, sealX + 22, sealY, 0.4), tones.red, 0.9);
  addSolid(
    seal,
    wobblyBox(rand, sealX + 60, sealY - 34, sealX + 104, sealY + 10, 0.6),
    tones.red,
    0.88,
  );
  kanji(seal, sealX + 82, sealY - 10, "空", tones, 30);
  addText(seal, {
    t: "空",
    tr: `translate(${sealX + 82} ${sealY - 10})`,
    fs: 30,
    font: "'Yuji Syuku', serif",
    fill: tones.paper,
  });
  note(seal, sealX + 40, sealY + 46, "a seal from your name", tones);
  addText(seal, {
    t: "Sora",
    tr: `translate(${sealX + 40} ${sealY + 96})`,
    fs: 30,
    font: "Kalam, cursive",
    fill: tones.ink,
    o: 0.85,
  });
  addLine(
    seal,
    wobblySegment(rand, [sealX - 30, sealY + 106], [sealX + 110, sealY + 106], 0.6, 3),
    tones.ink,
    0.8,
    0.4,
  );
  note(seal, sealX + 40, sealY + 128, "and your name, written by hand", tones, 13, 0.55);
  groups.push(seal);
  return { W: width, H: height, groups, clips: [] };
}

export { sceneGlazes, scenePaint };
