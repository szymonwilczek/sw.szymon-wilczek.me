// labels, hotspots and the workshop scene the kobo steps start from

import { SCENE_WIDTH, mix, hash, rng, roundCoord } from "../core.js";
import { wobblySegment, wobblyRing, newGroup, addWash, addLine, addText, inked } from "../pen.js";
import { face, post } from "../architecture.js";
import { obliqueScaled } from "../ceramics.js";
import { WORKSHOP_WIDTH, WORKSHOP_DEPTH, WORKSHOP_HEIGHT, workshopInside } from "../workshop.js";

// workshop, step by step
const note = (group, x, y, text, tones, fontSize, opacity) =>
  addText(group, {
    t: text,
    tr: `translate(${roundCoord(x)} ${roundCoord(y)})`,
    fs: fontSize || 15,
    font: "Kalam, cursive",
    fill: tones.ink,
    o: opacity ?? 0.65,
  });
const kanji = (group, x, y, text, tones, fontSize) =>
  addText(group, {
    t: text,
    tr: `translate(${roundCoord(x)} ${roundCoord(y)})`,
    fs: fontSize || 24,
    font: "'Yuji Syuku', serif",
    fill: tones.ink,
    o: 0.85,
  });

function frames(group, rand, labels, tones, H) {
  const count = labels.length,
    width = SCENE_WIDTH / count;
  labels.forEach(([glyph, caption], i) => {
    kanji(group, i * width + 26, 44, glyph, tones);
    note(group, i * width + 26 + 30 + caption.length * 3.6, 44, caption, tones, 17, 0.75);
    if (i)
      addLine(
        group,
        wobblySegment(rand, [i * width, 80], [i * width, H - 30], 0.6, 3),
        tones.ink,
        0.8,
        0.18,
      );
  });
  return (i) => i * width + width / 2;
}

// hotspot in the workshop
function hotspot(group, rand, x, y, glyph, caption, tones) {
  addWash(group, rand, wobblyRing(rand, x, y, 40, 26, 3, 12), tones.gold, 0.32, "url(#bk-bleed)");
  inked(group, rand, wobblyRing(rand, x, y - 64, 15, 15, 0.4, 12), tones.paper, tones.ink, 1);
  kanji(group, x, y - 63, glyph, tones, 16);
  note(group, x, y - 38, caption, tones, 13, 0.7);
}

// inside the workshop, once the roof has lifted
function sceneWorkshop(tones) {
  const rand = rng(hash("tea/workshop")),
    width = SCENE_WIDTH,
    height = 560,
    groups = [];
  const project = obliqueScaled(40, 500, 2.55),
    scale = 2.55;
  const backLink = newGroup({ cls: "kobo-back" });
  note(backLink, 110, 34, "← back to the garden", tones, 17, 0.75);
  groups.push(backLink);
  const wallCount = workshopInside(groups, rand, project, tones, scale);
  const door = newGroup();
  face(
    door,
    rand,
    project,
    [
      [160, WORKSHOP_DEPTH, 0],
      [190, WORKSHOP_DEPTH, 0],
      [190, WORKSHOP_DEPTH, 72],
      [160, WORKSHOP_DEPTH, 72],
    ],
    tones.glowSoft,
    tones,
    1,
  );
  const doorAt = project(175, WORKSHOP_DEPTH, 30);
  addWash(
    door,
    rand,
    wobblyRing(rand, doorAt[0], doorAt[1], 30, 70, 3, 10),
    tones.gold,
    0.4,
    "url(#bk-bleed)",
  );
  groups.splice(wallCount, 0, door);
  const front = newGroup();
  face(
    front,
    rand,
    project,
    [
      [WORKSHOP_WIDTH, 0, 0],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH, 0],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH, 16],
      [WORKSHOP_WIDTH, 0, 16],
    ],
    mix(tones.wood, tones.ink, 0.15),
    tones,
    1.1,
  );
  face(
    front,
    rand,
    project,
    [
      [0, 0, 0],
      [WORKSHOP_WIDTH, 0, 0],
      [WORKSHOP_WIDTH, 0, 12],
      [0, 0, 12],
    ],
    tones.wood,
    tones,
    1.1,
  );
  [0, WORKSHOP_WIDTH].forEach((x) => post(front, rand, project, x, 0, 0, 12, tones, 9));
  [
    [0, WORKSHOP_DEPTH],
    [WORKSHOP_WIDTH, WORKSHOP_DEPTH],
  ].forEach(([x, z]) => post(front, rand, project, x, z, 0, WORKSHOP_HEIGHT, tones, 9));
  groups.push(front);

  const spots = [
    ["wheel", 60, 40, 6, "轆", "the wheel"],
    ["shelf", 84, WORKSHOP_DEPTH - 12, 72, "棚", "drying shelf"],
    ["glaze", 236, WORKSHOP_DEPTH - 24, 14, "釉", "glazes"],
    ["brush", 196, 14, 14, "筆", "brush & seal"],
    ["kiln", 175, WORKSHOP_DEPTH, 65, "窯", "out to the kiln"],
  ].map(([id, x, z, y, glyph, caption]) => {
    const [spotX, spotY] = project(x, z, y),
      hotspotGroup = newGroup({ cls: "kobo-" + id });
    hotspot(hotspotGroup, rand, spotX, spotY, glyph, caption, tones);
    groups.push(hotspotGroup);
    return { id, x: Math.round(spotX), y: Math.round(spotY) };
  });
  return { W: width, H: height, groups, clips: [], spots };
}

export { note, kanji, frames, hotspot, sceneWorkshop };
