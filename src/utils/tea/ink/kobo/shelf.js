// the drying shelf and the piece card

import { SCENE_WIDTH, hash, rng, roundCoord } from "../core.js";
import {
  wobblyPolygon,
  wobblyBox,
  wobblySegment,
  wobblyRing,
  newGroup,
  addWash,
  addLine,
  addSolid,
  inked,
} from "../pen.js";
import { piece, demoSpec } from "../ceramics.js";
import { note, kanji } from "./steps.js";

// frame of short dashes, for what is not quite there yet
function dashed(group, rand, x0, y0, x1, y1, tones) {
  const edge = (from, to) => {
    const dashes = Math.max(2, Math.round(Math.hypot(to[0] - from[0], to[1] - from[1]) / 12));
    for (let dash = 0; dash < dashes; dash += 2) {
      const dashFrom = dash / dashes,
        dashTo = Math.min(1, (dash + 1) / dashes);
      const pointAt = (along) => [
        roundCoord(from[0] + (to[0] - from[0]) * along + (rand() - 0.5)),
        roundCoord(from[1] + (to[1] - from[1]) * along + (rand() - 0.5)),
      ];
      const [start, end] = [pointAt(dashFrom), pointAt(dashTo)];
      addLine(group, `M${start[0]} ${start[1]}L${end[0]} ${end[1]}`, tones.ink, 1, 0.5, true);
    }
  };
  edge([x0, y0], [x1, y0]);
  edge([x1, y0], [x1, y1]);
  edge([x1, y1], [x0, y1]);
  edge([x0, y1], [x0, y0]);
}

// shelf in the waiting room
function sceneShelf(tones, opt = {}) {
  const rand = rng(hash("tea/shelf")),
    width = SCENE_WIDTH,
    height = 700,
    groups = [],
    group = newGroup(),
    spots = [];
  note(group, 110, 34, "← back to the garden", tones, 17, 0.75);
  inked(group, rand, wobblyBox(rand, 40, 70, 1060, 680, 1), tones.plaster, tones.ink, 1.2);
  for (let slot = 0; slot < 40; slot++)
    addSolid(
      group,
      wobblyRing(rand, 60 + rand() * 980, 90 + rand() * 570, 1 + rand() * 2, 0.6 + rand(), 0.3, 6),
      tones.plasterDk,
      0.3,
    );
  inked(group, rand, wobblyBox(rand, 900, 110, 1020, 290, 1), tones.glowSoft, tones.ink, 1);
  for (let x = 914; x < 1020; x += 16)
    addLine(group, wobblySegment(rand, [x, 112], [x, 288], 0.3, 2), tones.bamboo, 2.4, 0.85, true);
  groups.push(group);
  const rows = [220, 410, 600];
  const pieces =
    opt.pieces ||
    rows.flatMap((_, row) => [0, 1, 2, 3, 4, 5].map((i) => demoSpec("shelf" + row + i)));
  const guestPieces = opt.pieces
    ? opt.own || []
    : [Object.assign(demoSpec("Sora", "bowl"), { kin: null })];
  // the newest of the guest's own sits apart by the window
  const newest = guestPieces.length ? guestPieces[guestPieces.length - 1] : null;
  const placed = [
    ...pieces.map((spec) => ({ spec })),
    ...guestPieces.slice(0, -1).map((spec) => ({ spec, own: true })),
  ].slice(-18);
  rows.forEach((y, row) => {
    const shelf = newGroup();
    inked(
      shelf,
      rand,
      wobblyPolygon(
        rand,
        [
          [70, y],
          [860, y],
          [880, y - 16],
          [90, y - 16],
        ],
        0.5,
      ),
      tones.woodLt,
      tones.ink,
      1.1,
    );
    inked(shelf, rand, wobblyBox(rand, 70, y, 860, y + 9, 0.4), tones.wood, tones.ink, 1);
    [100, 830].forEach((x) =>
      inked(
        shelf,
        rand,
        wobblyBox(rand, x - 6, y + 9, x + 6, y + 30, 0.3),
        tones.woodDk,
        tones.ink,
        0.9,
      ),
    );
    groups.push(shelf);
    const piecesGroup = newGroup();
    for (let i = 0; i < 6; i++) {
      const slot = row * 6 + i,
        entry = placed[slot];
      if (!entry) continue;
      const x = 140 + i * 130,
        spec = entry.spec,
        scale = spec.H < 20 ? 0.62 : 0.75;
      if (opt.sel === slot)
        addWash(
          piecesGroup,
          rand,
          wobblyRing(rand, x, y - 40, 70, 60, 3, 12),
          tones.gold,
          0.45,
          "url(#bk-bleed)",
        );
      if (entry.own) {
        dashed(piecesGroup, rand, x - 60, y - 120, x + 60, y + 4, tones);
        kanji(piecesGroup, x - 44, y - 104, "仮", tones, 14);
      }
      piece(piecesGroup, rand, x, y - 14, scale, tones, spec);
      spots.push({ i: slot, x, y: y - 50, own: !!entry.own });
    }
    groups.push(piecesGroup);
  });

  if (!pieces.length && !guestPieces.length)
    note(group, 465, 400, "nothing on the shelf yet", tones, 18, 0.5);

  // author's own piece, waiting for me :)
  if (newest) {
    const newestGroup = newGroup(),
      newestX = 970,
      newestY = 600;
    dashed(newestGroup, rand, newestX - 66, newestY - 130, newestX + 66, newestY + 40, tones);
    piece(newestGroup, rand, newestX, newestY - 14, newest.H < 20 ? 0.62 : 0.75, tones, newest);
    kanji(newestGroup, newestX - 46, newestY - 110, "仮", tones, 16);
    note(newestGroup, newestX, newestY + 62, "yours · waiting for the host", tones, 13, 0.6);
    groups.push(newestGroup);
    spots.push({ i: placed.length, x: newestX, y: newestY - 50, own: true });
  }
  return { W: width, H: height, groups, clips: [], spots };
}

export { dashed, sceneShelf };
