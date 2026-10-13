// the roji garden scene

import { mix, hash, rng } from "./core.js";
import {
  wobblyPolygon,
  wobblySegment,
  wobblyRing,
  newGroup,
  addWash,
  addLine,
  addSolid,
  mist,
  oblique,
  projectAll,
} from "./pen.js";
import { stone, steppingStones } from "./garden.js";
import { face, post, gableRoof, plaque } from "./architecture.js";
import { sekiStone } from "./seki.js";
import { bambooClump } from "./bamboo.js";
import { piece, demoSpec } from "./ceramics.js";
import {
  WORKSHOP_WIDTH,
  WORKSHOP_DEPTH,
  WORKSHOP_HEIGHT,
  workshopWalls,
  dryingBench,
  noborigama,
  workshopInside,
} from "./workshop.js";

function sceneGarden16(tones, stage, opt = {}) {
  const open = stage === "open";
  const rand = rng(hash("tea/garden16")),
    width = 1100,
    height = 690,
    groups = [],
    clips = [];
  const ground = newGroup({ washO: 0.35 });
  [
    [240, 470, 220, 50],
    [700, 640, 240, 34],
    [900, 470, 140, 40],
  ].forEach(([x, y, rx, ry]) =>
    addWash(
      ground,
      rand,
      wobblyRing(rand, x, y, rx, ry, ry * 0.3, 12),
      tones.moss,
      0.22,
      "url(#bk-pool)",
    ),
  );
  for (let i = 0; i < 120; i++) {
    const x = rand() * width,
      y = 120 + rand() * (height - 130);
    addSolid(
      ground,
      wobblyRing(rand, x, y, 0.9 + rand() * 1.2, 0.7 + rand() * 0.8, 0.3, 6),
      tones.mossDk,
      0.1 + rand() * 0.15,
    );
  }
  groups.push(ground);
  const path = newGroup();
  steppingStones(
    path,
    rand,
    [
      [420, 686],
      [446, 648],
      [476, 612],
      [512, 580],
      [550, 552],
      [590, 528],
      [628, 506],
      [380, 664],
      [330, 668],
      [280, 676],
    ],
    tones,
    0.9,
  );
  groups.push(path);

  // workshop
  const workshopProject = oblique(470, 452),
    workshopShadow = newGroup();
  addWash(
    workshopShadow,
    rand,
    wobblyPolygon(
      rand,
      projectAll(workshopProject, [
        [-14, -16, 0],
        [WORKSHOP_WIDTH + 16, -16, 0],
        [WORKSHOP_WIDTH + 16, WORKSHOP_DEPTH + 12, 0],
        [-14, WORKSHOP_DEPTH + 12, 0],
      ]),
      3,
    ),
    tones.pool,
    0.6,
    "url(#bk-pool)",
  );
  groups.push(workshopShadow);
  if (!open) {
    const walls = newGroup();
    workshopWalls(walls, rand, workshopProject, tones);
    groups.push(walls);
    const roof = newGroup({ cls: "roji-roof" });
    gableRoof(
      roof,
      rand,
      workshopProject,
      WORKSHOP_WIDTH,
      WORKSHOP_DEPTH,
      WORKSHOP_HEIGHT,
      72,
      20,
      tones,
      "thatch",
    );
    plaque(
      roof,
      rand,
      ...workshopProject(152, -20, WORKSHOP_HEIGHT - 14),
      40,
      16,
      "工房",
      "'Yuji Syuku', serif",
      11,
      tones,
    );
    groups.push(roof);
  } else {
    workshopInside(groups, rand, workshopProject, tones);
    const lowWalls = newGroup();
    face(
      lowWalls,
      rand,
      workshopProject,
      [
        [WORKSHOP_WIDTH, 0, 0],
        [WORKSHOP_WIDTH, WORKSHOP_DEPTH, 0],
        [WORKSHOP_WIDTH, WORKSHOP_DEPTH, 26],
        [WORKSHOP_WIDTH, 0, 26],
      ],
      mix(tones.wood, tones.ink, 0.15),
      tones,
      1.1,
    );
    face(
      lowWalls,
      rand,
      workshopProject,
      [
        [0, 0, 0],
        [118, 0, 0],
        [118, 0, 22],
        [0, 0, 22],
      ],
      tones.wood,
      tones,
      1.1,
    );
    face(
      lowWalls,
      rand,
      workshopProject,
      [
        [186, 0, 0],
        [WORKSHOP_WIDTH, 0, 0],
        [WORKSHOP_WIDTH, 0, 22],
        [186, 0, 22],
      ],
      tones.wood,
      tones,
      1.1,
    );
    [0, 118, 186, WORKSHOP_WIDTH].forEach((x) =>
      post(lowWalls, rand, workshopProject, x, 0, 0, 22, tones, 5),
    );
    [
      [0, WORKSHOP_DEPTH],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH],
    ].forEach(([x, z]) =>
      post(lowWalls, rand, workshopProject, x, z, 0, WORKSHOP_HEIGHT, tones, 5),
    );
    plaque(
      lowWalls,
      rand,
      ...workshopProject(152, -6, 14),
      36,
      14,
      "工房",
      "'Yuji Syuku', serif",
      10,
      tones,
    );
    groups.push(lowWalls);
  }
  const bench = newGroup();
  dryingBench(bench, rand, workshopProject, 8, 104, -26, tones, 0.3);
  groups.push(bench);
  noborigama(groups, rand, 870, 612, tones, open);
  const bamboo = [];
  bambooClump(bamboo, rng(hash("bb")), 250, 404, tones, 1, opt.cut);
  groups.push({ cls: "roji-bamboo", groups: bamboo });

  // waiting room
  const waitingProject = oblique(36, 664),
    waitingRoom = newGroup({ cls: "roji-machiai" }),
    waitingHeight = 178;
  addWash(
    waitingRoom,
    rand,
    wobblyPolygon(
      rand,
      projectAll(waitingProject, [
        [-10, -10, 0],
        [224, -10, 0],
        [224, 90, 0],
        [-10, 90, 0],
      ]),
      3,
    ),
    tones.pool,
    0.6,
    "url(#bk-pool)",
  );
  face(
    waitingRoom,
    rand,
    waitingProject,
    [
      [0, 0, 0],
      [0, 80, 0],
      [0, 80, waitingHeight],
      [0, 0, waitingHeight],
    ],
    tones.plasterDk,
    tones,
  );
  face(
    waitingRoom,
    rand,
    waitingProject,
    [
      [0, 80, 0],
      [214, 80, 0],
      [214, 80, waitingHeight],
      [0, 80, waitingHeight],
    ],
    tones.plaster,
    tones,
  );
  face(
    waitingRoom,
    rand,
    waitingProject,
    [
      [0, 0, 0],
      [214, 0, 0],
      [214, 80, 0],
      [0, 80, 0],
    ],
    tones.earth,
    tones,
    1,
    1.2,
  );
  post(waitingRoom, rand, waitingProject, 0, 0, 0, waitingHeight, tones);
  post(waitingRoom, rand, waitingProject, 0, 80, 0, waitingHeight, tones);
  post(waitingRoom, rand, waitingProject, 214, 80, 0, waitingHeight, tones);
  face(
    waitingRoom,
    rand,
    waitingProject,
    [
      [0, 80, waitingHeight],
      [214, 80, waitingHeight],
      [214, 84, waitingHeight],
      [0, 84, waitingHeight],
    ],
    tones.wood,
    tones,
    1,
  );
  face(
    waitingRoom,
    rand,
    waitingProject,
    [
      [156, 80, 66],
      [202, 80, 66],
      [202, 80, 116],
      [156, 80, 116],
    ],
    tones.glowSoft,
    tones,
    0.9,
  );
  for (let x = 162; x < 202; x += 8)
    addLine(
      waitingRoom,
      wobblySegment(rand, waitingProject(x, 80, 67), waitingProject(x, 80, 115), 0.2, 1),
      tones.bamboo,
      1.2,
      0.8,
      true,
    );
  groups.push(waitingRoom);
  const shelf = newGroup();
  addWash(
    shelf,
    rand,
    wobblyPolygon(
      rand,
      projectAll(waitingProject, [
        [14, 80, 24],
        [144, 80, 24],
        [144, 80, 168],
        [14, 80, 168],
      ]),
      3,
    ),
    tones.glowSoft,
    0.45,
    "url(#bk-bleed)",
  );
  [36, 82, 128].forEach((y, row) => {
    face(
      shelf,
      rand,
      waitingProject,
      [
        [16, 80, y],
        [142, 80, y],
        [142, 70, y],
        [16, 70, y],
      ],
      tones.woodLt,
      tones,
      0.9,
    );
    for (let i = 0; i < 5; i++) {
      const spot = waitingProject(28 + i * 26, 75, y);
      const spec = opt.shelf ? opt.shelf(row * 5 + i) : demoSpec("g" + row + i);
      if (spec) piece(shelf, rand, spot[0], spot[1] - 1, 0.24, tones, spec);
    }
  });
  groups.push(shelf);
  const waitingBench = newGroup();
  face(
    waitingBench,
    rand,
    waitingProject,
    [
      [10, 26, 0],
      [204, 26, 0],
      [204, 26, 18],
      [10, 26, 18],
    ],
    tones.woodDk,
    tones,
    1.1,
  );
  face(
    waitingBench,
    rand,
    waitingProject,
    [
      [10, 26, 18],
      [204, 26, 18],
      [204, 56, 18],
      [10, 56, 18],
    ],
    tones.wood,
    tones,
    1.1,
  );
  groups.push(waitingBench);

  // one stone, before the workshop door
  if (open) {
    const doorStone = newGroup();
    stone(doorStone, rand, 664, 506, 30, 11, tones);
    groups.push(doorStone);
  } else {
    const seki = [];
    sekiStone(seki, rand, 640, 504, 1.15, tones, false);
    groups.push({ cls: "roji-stone", groups: seki });
  }
  const clouds = newGroup({ washO: 0.5 }),
    grey = mix(tones.inkSoft, tones.paper, 0.55);
  mist(clouds, rand, 760, 1110, 128, 34, grey, 0.7, mix(grey, tones.ink, 0.25));
  groups.push(clouds);
  return { W: width, H: height, groups, clips };
}

export { sceneGarden16 };
