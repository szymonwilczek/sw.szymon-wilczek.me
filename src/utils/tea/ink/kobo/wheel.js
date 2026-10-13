// the wheel and shapes steps

import { SCENE_WIDTH, hash, rng } from "../core.js";
import { wobblyLine, wobblyRing, newGroup, addLine, inked, brushStroke } from "../pen.js";
import { CLAYS, PROFILES } from "../ceramics.js";
import { wheel, spin, wetClay, fingertip, arrowLine } from "../tools.js";
import { note, frames } from "./steps.js";

// throwing
function sceneWheel(tones) {
  const rand = rng(hash("tea/wheel")),
    width = SCENE_WIDTH,
    height = 470,
    groups = [],
    y = 330,
    scale = 1.25;
  const labels = newGroup(),
    centerOf = frames(
      labels,
      rand,
      [
        ["一", "centre"],
        ["二", "open"],
        ["三", "pull up"],
        ["四", "shape"],
      ],
      tones,
      height,
    );
  groups.push(labels);
  const panels = [0, 1, 2, 3].map(() => newGroup());
  panels.forEach((group, i) => {
    wheel(group, rand, centerOf(i), y, scale, tones);
  });
  // wobbly lump
  wetClay(
    panels[0],
    rand,
    centerOf(0) + 3,
    y - 2,
    scale,
    tones,
    [
      [30, 0],
      [36, 0.35],
      [28, 0.8],
      [14, 1],
    ],
    40,
  );
  fingertip(panels[0], rand, centerOf(0) - 66, y - 34, tones);
  fingertip(panels[0], rand, centerOf(0) + 66, y - 34, tones);
  arrowLine(
    panels[0],
    rand,
    [
      [centerOf(0) - 100, y - 34],
      [centerOf(0) - 80, y - 34],
    ],
    tones,
  );
  arrowLine(
    panels[0],
    rand,
    [
      [centerOf(0) + 100, y - 34],
      [centerOf(0) + 80, y - 34],
    ],
    tones,
  );
  spin(panels[0], rand, centerOf(0), y + 8, 74, 20, tones);
  note(panels[0], centerOf(0), y + 124, "hold both sides still while it spins", tones);
  // press a thumb into the middle
  wetClay(
    panels[1],
    rand,
    centerOf(1),
    y - 2,
    scale,
    tones,
    [
      [30, 0],
      [33, 0.4],
      [32, 0.9],
      [26, 1],
    ],
    34,
  );
  fingertip(panels[1], rand, centerOf(1), y - 64, tones);
  arrowLine(
    panels[1],
    rand,
    [
      [centerOf(1), y - 120],
      [centerOf(1), y - 80],
    ],
    tones,
  );
  spin(panels[1], rand, centerOf(1), y + 8, 74, 20, tones);
  note(panels[1], centerOf(1), y + 124, "press down, not too deep", tones);
  // pull the wall up between two fingers
  addLine(
    panels[2],
    wobblyLine(
      rand,
      [
        [centerOf(2) - 40, y - 2],
        [centerOf(2) - 42, y - 42],
      ],
      0.4,
    ),
    tones.ink,
    1,
    0.25,
  );
  wetClay(
    panels[2],
    rand,
    centerOf(2),
    y - 2,
    scale,
    tones,
    [
      [26, 0],
      [27, 0.4],
      [25, 0.9],
      [23, 1],
    ],
    70,
  );
  fingertip(panels[2], rand, centerOf(2) + 38, y - 70, tones);
  arrowLine(
    panels[2],
    rand,
    [
      [centerOf(2) + 60, y - 30],
      [centerOf(2) + 60, y - 110],
    ],
    tones,
  );
  spin(panels[2], rand, centerOf(2), y + 8, 74, 20, tones);
  note(panels[2], centerOf(2), y + 124, "drag upward along the wall", tones);
  // drag the profile out or in; dots show where your finger can catch it
  const profile = [
    [24, 0],
    [38, 0.25],
    [50, 0.65],
    [54, 1],
  ];
  wetClay(panels[3], rand, centerOf(3), y - 2, scale, tones, profile, 46);
  const lumpHeight = 46 * scale,
    lumpTop = y - 2 - lumpHeight;
  profile.forEach(([radius, level]) => {
    const dot = [centerOf(3) + radius * scale, lumpTop + (1 - level) * lumpHeight];
    inked(
      panels[3],
      rand,
      wobblyRing(rand, dot[0], dot[1], 3.5, 3.5, 0.2, 8),
      tones.paper,
      tones.ink,
      1,
    );
  });
  fingertip(panels[3], rand, centerOf(3) + 50 * scale + 10, lumpTop + 0.35 * lumpHeight, tones);
  arrowLine(
    panels[3],
    rand,
    [
      [centerOf(3) + 40, lumpTop + 20],
      [centerOf(3) + 92, lumpTop + 6],
    ],
    tones,
  );
  spin(panels[3], rand, centerOf(3), y + 8, 74, 20, tones);
  note(panels[3], centerOf(3), y + 124, "pull out for a bowl, in for a cup", tones);
  panels.forEach((group) => groups.push(group));
  return { W: width, H: height, groups, clips: [] };
}

// what the same lump can become
function sceneShapes(tones) {
  const rand = rng(hash("tea/shapes")),
    width = SCENE_WIDTH,
    height = 420,
    group = newGroup(),
    y = 300;
  [
    ["plate", "press down and out", 0.95],
    ["hira", "a wide shallow bowl", 1.2],
    ["bowl", "a tea bowl", 1.4],
    ["yunomi", "a tall cup", 1.5],
    ["cup", "a cup, with a handle", 1.5],
  ].forEach(([kind, caption, scale], i) => {
    const x = 110 + i * 220;
    wetClay(group, rand, x, y, scale, tones, PROFILES[kind].prof, PROFILES[kind].H);
    note(group, x, y + 80, caption, tones);
  });
  // handle
  const handleX = 990,
    handleY = 150;
  brushStroke(
    group,
    rand,
    [
      [handleX - 60, handleY - 60],
      [handleX - 40, handleY - 40],
      [handleX - 30, handleY - 12],
    ],
    7,
    CLAYS(tones)[0],
    1,
    { blunt: true, tip: 0.6 },
  );
  addLine(
    group,
    wobblyLine(
      rand,
      [
        [handleX - 60, handleY - 60],
        [handleX - 40, handleY - 40],
        [handleX - 30, handleY - 12],
      ],
      0.3,
    ),
    tones.ink,
    0.8,
    0.6,
  );
  fingertip(group, rand, handleX - 66, handleY - 66, tones);
  arrowLine(
    group,
    rand,
    [
      [handleX - 20, handleY - 10],
      [handleX - 8, y - 70],
    ],
    tones,
    0.45,
  );
  note(group, handleX - 40, handleY - 92, "pull a handle", tones, 13);
  return { W: width, H: height, groups: [group], clips: [] };
}

export { sceneWheel, sceneShapes };
