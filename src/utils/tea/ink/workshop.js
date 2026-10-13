// the workshop building

import { mix, roundCoord, lerp } from "./core.js";
import {
  jitter,
  wobblyPolygon,
  wobblyLine,
  wobblySegment,
  wobblyRing,
  newGroup,
  addWash,
  addLine,
  addSolid,
  addText,
  inked,
  brushStroke,
  brushWash,
  projectAll,
} from "./pen.js";
import { face, post } from "./architecture.js";
import { GLAZES, PAINTS, radiusAt, PROFILES, piece } from "./ceramics.js";
import { wheel, wetClay, bucket, brushTool } from "./tools.js";

// pottery workshop, its climbing kiln, and the shelf in the waiting room
const WORKSHOP_WIDTH = 300,
  WORKSHOP_DEPTH = 140,
  WORKSHOP_HEIGHT = 100;

// short indigo curtain in the doorway, split in three
function noren(group, rand, project, x0, x1, topY, drop, tones, text) {
  const indigo = mix(tones.water, tones.ink, 0.45),
    panels = 3,
    panelWidth = (x1 - x0) / panels;
  for (let panel = 0; panel < panels; panel++) {
    const left = x0 + panel * panelWidth + 0.6,
      right = x0 + (panel + 1) * panelWidth - 0.6;
    const outline = wobblyPolygon(
      rand,
      projectAll(project, [
        [left, 0, topY],
        [right, 0, topY],
        [right, 0, topY - drop - jitter(rand, 1)],
        [left, 0, topY - drop - jitter(rand, 1)],
      ]),
      0.5,
    );
    addSolid(group, outline, indigo, 0.95);
    addLine(group, outline, tones.ink, 0.9, 0.85);
  }
  addLine(
    group,
    wobblySegment(rand, project(x0 - 4, 0, topY + 1), project(x1 + 4, 0, topY + 1), 0.3, 2),
    tones.woodDk,
    2.4,
    0.95,
    true,
  );
  const center = project((x0 + x1) / 2, 0, topY - drop * 0.45),
    size = Math.abs(project(0, 0, 0)[1] - project(0, 0, drop)[1]) * 0.42;
  addText(group, {
    t: text,
    tr: `translate(${roundCoord(center[0])} ${roundCoord(center[1])})`,
    fs: size,
    font: "'Yuji Syuku', serif",
    fill: tones.paper,
    o: 0.9,
  });
}

function workshopWalls(group, rand, project, tones) {
  face(
    group,
    rand,
    project,
    [
      [WORKSHOP_WIDTH, 0, 0],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH, 0],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH, WORKSHOP_HEIGHT],
      [WORKSHOP_WIDTH, 0, WORKSHOP_HEIGHT],
    ],
    tones.plasterDk,
    tones,
  );
  face(
    group,
    rand,
    project,
    [
      [0, 0, 0],
      [WORKSHOP_WIDTH, 0, 0],
      [WORKSHOP_WIDTH, 0, WORKSHOP_HEIGHT],
      [0, 0, WORKSHOP_HEIGHT],
    ],
    tones.plaster,
    tones,
  );
  face(
    group,
    rand,
    project,
    [
      [0, 0, 0],
      [WORKSHOP_WIDTH, 0, 0],
      [WORKSHOP_WIDTH, 0, 46],
      [0, 0, 46],
    ],
    tones.wood,
    tones,
    1.1,
  );
  face(
    group,
    rand,
    project,
    [
      [WORKSHOP_WIDTH, 0, 0],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH, 0],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH, 46],
      [WORKSHOP_WIDTH, 0, 46],
    ],
    mix(tones.wood, tones.ink, 0.15),
    tones,
    1.1,
  );
  for (let x = 7; x < WORKSHOP_WIDTH; x += 9)
    addLine(
      group,
      wobblySegment(rand, project(x, 0, 1), project(x, 0, 45), 0.3, 2),
      tones.woodDk,
      0.8,
      0.55,
      true,
    );
  for (let z = 7; z < WORKSHOP_DEPTH; z += 9)
    addLine(
      group,
      wobblySegment(rand, project(WORKSHOP_WIDTH, z, 1), project(WORKSHOP_WIDTH, z, 45), 0.3, 2),
      tones.woodDk,
      0.8,
      0.5,
      true,
    );
  // the doorway, open, with the noren
  face(
    group,
    rand,
    project,
    [
      [118, 0, 0],
      [186, 0, 0],
      [186, 0, 76],
      [118, 0, 76],
    ],
    tones.deep,
    tones,
    1,
  );
  noren(group, rand, project, 118, 186, 76, 34, tones, "陶");
  [
    [32, 84],
    [222, 272],
  ].forEach(([left, right]) => {
    face(
      group,
      rand,
      project,
      [
        [left, 0, 54],
        [right, 0, 54],
        [right, 0, 82],
        [left, 0, 82],
      ],
      tones.deep,
      tones,
      0.9,
    );
    for (let x = left + 6; x < right; x += 7)
      addLine(
        group,
        wobblySegment(rand, project(x, 0, 55), project(x, 0, 81), 0.2, 1),
        tones.bamboo,
        1.6,
        0.9,
        true,
      );
  });
  [0, 118, 186, WORKSHOP_WIDTH].forEach((x) =>
    post(group, rand, project, x, 0, 0, WORKSHOP_HEIGHT, tones, 5),
  );
  post(group, rand, project, WORKSHOP_WIDTH, WORKSHOP_DEPTH, 0, WORKSHOP_HEIGHT, tones, 5);
  addLine(
    group,
    wobblySegment(rand, project(0, 0, 46), project(WORKSHOP_WIDTH, 0, 46), 0.3, 2),
    tones.woodDk,
    3,
    0.9,
    true,
  );
}

// a long plank on two blocks, with bisque drying in the sun
function dryingBench(group, rand, project, x0, x1, z, tones, scale) {
  face(
    group,
    rand,
    project,
    [
      [x0, z, 12],
      [x1, z, 12],
      [x1, z + 10, 12],
      [x0, z + 10, 12],
    ],
    tones.woodLt,
    tones,
    1,
  );
  face(
    group,
    rand,
    project,
    [
      [x0, z, 9],
      [x1, z, 9],
      [x1, z, 12],
      [x0, z, 12],
    ],
    tones.wood,
    tones,
    0.9,
  );
  [x0 + 6, x1 - 10].forEach((x) =>
    face(
      group,
      rand,
      project,
      [
        [x, z, 0],
        [x + 5, z, 0],
        [x + 5, z, 9],
        [x, z, 9],
      ],
      tones.woodDk,
      tones,
      0.8,
    ),
  );
  ["cup", "bowl", "yunomi", "hira", "bowl"].forEach((kind, i) => {
    const spot = project(lerp(x0 + 10, x1 - 10, i / 4), z + 5, 12);
    piece(
      group,
      rand,
      spot[0],
      spot[1] - 1,
      scale,
      tones,
      Object.assign(
        { clay: [0, 3, 0, 1, 3][i], glaze: { none: true }, fire: 11 + i },
        PROFILES[kind],
      ),
    );
  });
}

// climbing kiln
function noborigama(groups, rand, baseX, baseY, tones, lit) {
  const chambers = 4,
    chamberWidth = 92,
    archHeight = 46,
    chamberDepth = 46,
    rise = 17,
    brick = mix(tones.earth, tones.kura, 0.35);
  const project = (x, z, y) => [baseX + x + z * 0.6, baseY - z * 0.42 - y];
  const group = newGroup();
  addWash(
    group,
    rand,
    wobblyPolygon(
      rand,
      projectAll(project, [
        [-30, -30, 0],
        [chamberWidth + 30, -30, 0],
        [chamberWidth + 30, chambers * chamberDepth + 40, chambers * rise],
        [-30, chambers * chamberDepth + 40, chambers * rise],
      ]),
      4,
    ),
    tones.earth,
    0.3,
    "url(#bk-pool)",
  );
  groups.push(group);
  // chimney at the top end of the slope
  const chimney = newGroup(),
    chimneyZ = chambers * chamberDepth + 4,
    chimneyY = chambers * rise,
    chimneyX = chamberWidth / 2 - 10;
  face(
    chimney,
    rand,
    project,
    [
      [chimneyX, chimneyZ, chimneyY],
      [chimneyX + 20, chimneyZ, chimneyY],
      [chimneyX + 20, chimneyZ, chimneyY + 140],
      [chimneyX, chimneyZ, chimneyY + 140],
    ],
    brick,
    tones,
    1.1,
  );
  face(
    chimney,
    rand,
    project,
    [
      [chimneyX + 20, chimneyZ, chimneyY],
      [chimneyX + 20, chimneyZ + 20, chimneyY],
      [chimneyX + 20, chimneyZ + 20, chimneyY + 140],
      [chimneyX + 20, chimneyZ, chimneyY + 140],
    ],
    mix(brick, tones.ink, 0.2),
    tones,
    1.1,
  );
  for (let y = 10; y < 140; y += 10)
    addLine(
      chimney,
      wobblySegment(
        rand,
        project(chimneyX, chimneyZ, chimneyY + y),
        project(chimneyX + 20, chimneyZ, chimneyY + y),
        0.2,
        1,
      ),
      tones.ink,
      0.5,
      0.35,
    );
  groups.push(chimney);
  const smoke = newGroup({ washO: 0.5 }),
    smokeFrom = project(chimneyX + 12, chimneyZ + 8, chimneyY + 146);
  const smokePath = [
    smokeFrom,
    [smokeFrom[0] - 12, smokeFrom[1] - 40],
    [smokeFrom[0] + 10, smokeFrom[1] - 80],
    [smokeFrom[0] - 6, smokeFrom[1] - 120],
    [smokeFrom[0] - 40, smokeFrom[1] - 160],
  ];
  brushWash(
    smoke,
    rand,
    smokePath,
    lit ? 24 : 12,
    mix(tones.inkSoft, tones.paper, 0.5),
    lit ? 0.55 : 0.3,
  );
  brushStroke(smoke, rand, smokePath, 1.4, tones.inkSoft, 0.35, { tip: 0.1, head: 0.05 });
  groups.push(smoke);
  for (let i = chambers - 1; i >= 0; i--) {
    const chamberZ = i * chamberDepth,
      chamberY = i * rise,
      chamberGroup = newGroup();
    const arch = (z, steps) =>
      Array.from({ length: (steps || 12) + 1 }, (_, step) => {
        const angle = Math.PI * (step / (steps || 12));
        return project(
          (chamberWidth / 2) * (1 - Math.cos(angle)),
          z,
          chamberY + Math.sin(angle) * archHeight,
        );
      });
    const frontArch = arch(chamberZ),
      backArch = arch(chamberZ + chamberDepth);
    // barrel roof, then the front face of this chamber
    addSolid(
      chamberGroup,
      wobblyPolygon(rand, [...frontArch.slice(3), ...backArch.slice(3).reverse()], 0.4),
      mix(brick, tones.paper, 0.18),
      1,
    );
    for (let rib = 1; rib < 4; rib++)
      addLine(
        chamberGroup,
        wobblyLine(rand, arch(chamberZ + (chamberDepth * rib) / 4).slice(4), 0.3),
        tones.ink,
        0.6,
        0.4,
      );
    addLine(chamberGroup, wobblyLine(rand, backArch.slice(4), 0.4), tones.ink, 1, 0.8);
    addLine(chamberGroup, wobblyLine(rand, [frontArch[12], backArch[12]], 0.3), tones.ink, 1, 0.85);
    const frontFace = wobblyPolygon(rand, [...frontArch, project(0, chamberZ, chamberY)], 0.4);
    addSolid(chamberGroup, frontFace, mix(brick, tones.ink, 0.1), 1);
    addLine(chamberGroup, wobblyLine(rand, frontArch, 0.4), tones.ink, 1.3, 0.95);
    addLine(chamberGroup, wobblyLine(rand, [frontArch[0], frontArch[12]], 0.3), tones.ink, 1, 0.9);
    // bricked-up door in the face, with a stoking hole in it
    const glowing = lit && i < 3,
      stokeHole = project(
        chamberWidth * 0.93,
        chamberZ + chamberDepth * 0.5,
        chamberY + archHeight * 0.42,
      );
    if (glowing)
      addWash(
        chamberGroup,
        rand,
        wobblyRing(rand, stokeHole[0], stokeHole[1], 16, 12, 2, 10),
        tones.gold,
        0.6,
        "url(#bk-bleed)",
      );
    addSolid(
      chamberGroup,
      wobblyRing(rand, stokeHole[0], stokeHole[1], 4, 5.5, 0.3, 9),
      glowing ? mix(tones.gold, tones.red, 0.4) : tones.deep,
      1,
    );
    addLine(
      chamberGroup,
      wobblyRing(rand, stokeHole[0], stokeHole[1], 4, 5.5, 0.3, 9),
      tones.ink,
      0.9,
      0.9,
    );
    groups.push(chamberGroup);
  }
  // the firebox at the foot
  const firebox = newGroup(),
    mouth = project(chamberWidth / 2, -10, 0);
  if (lit)
    addWash(
      firebox,
      rand,
      wobblyRing(rand, mouth[0], mouth[1] - 10, 30, 20, 3, 10),
      tones.gold,
      0.65,
      "url(#bk-bleed)",
    );
  inked(
    firebox,
    rand,
    wobblyPolygon(
      rand,
      [
        [mouth[0] - 32, mouth[1] + 4],
        [mouth[0] - 26, mouth[1] - 24],
        [mouth[0] + 26, mouth[1] - 24],
        [mouth[0] + 32, mouth[1] + 4],
      ],
      0.6,
    ),
    mix(brick, tones.ink, 0.1),
    tones.ink,
    1.2,
  );
  addSolid(
    firebox,
    wobblyPolygon(
      rand,
      [
        [mouth[0] - 12, mouth[1] + 2],
        [mouth[0] - 10, mouth[1] - 15],
        [mouth[0] + 10, mouth[1] - 15],
        [mouth[0] + 12, mouth[1] + 2],
      ],
      0.4,
    ),
    lit ? mix(tones.gold, tones.red, 0.35) : tones.deep,
    1,
  );
  groups.push(firebox);
}

// what you see from above when the workshop roof is lifted
function workshopInside(groups, rand, project, tones, scale) {
  scale = scale || 1;
  const group = newGroup();
  groups.push(group);
  face(
    group,
    rand,
    project,
    [
      [0, 0, 0],
      [WORKSHOP_WIDTH, 0, 0],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH, 0],
      [0, WORKSHOP_DEPTH, 0],
    ],
    mix(tones.earth, tones.paper, 0.35),
    tones,
    1,
    1,
  );
  for (let k = 0; k < 60; k++) {
    const spot = project(rand() * WORKSHOP_WIDTH, rand() * WORKSHOP_DEPTH, 0);
    addSolid(
      group,
      wobblyRing(rand, spot[0], spot[1], 0.6 * scale, 0.4 * scale, 0.1, 5),
      tones.earth,
      0.4,
    );
  }
  face(
    group,
    rand,
    project,
    [
      [0, 0, 0],
      [0, WORKSHOP_DEPTH, 0],
      [0, WORKSHOP_DEPTH, WORKSHOP_HEIGHT],
      [0, 0, WORKSHOP_HEIGHT],
    ],
    tones.plasterDk,
    tones,
  );
  face(
    group,
    rand,
    project,
    [
      [0, WORKSHOP_DEPTH, 0],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH, 0],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH, WORKSHOP_HEIGHT],
      [0, WORKSHOP_DEPTH, WORKSHOP_HEIGHT],
    ],
    tones.plaster,
    tones,
  );
  const wallCount = groups.length;
  // shelves of bisque along the back wall
  [30, 58].forEach((y, row) => {
    const plank = newGroup();
    groups.push(plank);
    face(
      plank,
      rand,
      project,
      [
        [14, WORKSHOP_DEPTH, y],
        [150, WORKSHOP_DEPTH, y],
        [150, WORKSHOP_DEPTH - 12, y],
        [14, WORKSHOP_DEPTH - 12, y],
      ],
      tones.woodLt,
      tones,
      0.9,
    );
    for (let i = 0; i < 6; i++) {
      const spot = project(24 + i * 22, WORKSHOP_DEPTH - 6, y);
      const pot = newGroup();
      groups.push(pot);
      const profile = PROFILES[["cup", "bowl", "yunomi", "hira", "bowl", "cup"][(i + row) % 6]],
        potScale = 0.28 * scale;
      piece(
        pot,
        rand,
        spot[0],
        spot[1] - (radiusAt(profile.prof, 0) * 0.3 + 5) * potScale,
        potScale,
        tones,
        Object.assign(
          { clay: (i + row) % 2 ? 0 : 3, glaze: { none: true }, fire: i + row * 7 },
          profile,
        ),
      );
    }
  });
  // glaze buckets on the right
  GLAZES(tones)
    .slice(0, 5)
    .forEach((glazeColor, i) => {
      const spot = project(196 + i * 20, WORKSHOP_DEPTH - 18 - (i % 2) * 12, 0);
      const bucketGroup = newGroup();
      groups.push(bucketGroup);
      bucket(bucketGroup, rand, spot[0], spot[1], 0.36 * scale, tones, glazeColor);
    });
  // the kick wheel in the middle, with a lump of clay
  const wheelGroup = newGroup();
  groups.push(wheelGroup);
  const wheelAt = project(84, 62, 0);
  wheel(wheelGroup, rand, wheelAt[0], wheelAt[1] - 18 * scale, 0.42 * scale, tones);
  // the clay in a group of its own, so the wheel's ink stays under it
  const clayGroup = newGroup();
  groups.push(clayGroup);
  wetClay(
    clayGroup,
    rand,
    wheelAt[0],
    wheelAt[1] - 20 * scale,
    0.3 * scale,
    tones,
    [
      [18, 0],
      [22, 0.4],
      [16, 1],
    ],
    30,
  );
  addSolid(
    wheelGroup,
    wobblyRing(rand, wheelAt[0] - 34 * scale, wheelAt[1] + 6 * scale, 9 * scale, 4 * scale, 0.3, 8),
    tones.woodDk,
    0.95,
  );
  // the painting table by the right window
  const tableLeft = 200,
    tableRight = 280,
    tableNear = 30,
    tableFar = 70,
    tableHeight = 18;
  const table = newGroup();
  groups.push(table);
  face(
    table,
    rand,
    project,
    [
      [tableRight, tableNear, 0],
      [tableRight, tableFar, 0],
      [tableRight, tableFar, tableHeight],
      [tableRight, tableNear, tableHeight],
    ],
    tones.wood,
    tones,
    1,
  );
  face(
    table,
    rand,
    project,
    [
      [tableLeft, tableNear, tableHeight],
      [tableRight, tableNear, tableHeight],
      [tableRight, tableFar, tableHeight],
      [tableLeft, tableFar, tableHeight],
    ],
    tones.woodLt,
    tones,
    1,
  );
  [
    [tableLeft, tableNear],
    [tableRight, tableNear],
  ].forEach(([x, z]) => post(table, rand, project, x, z, 0, tableHeight, tones, 3));
  const tableTop = project(226, 50, tableHeight);
  const tableItems = newGroup();
  groups.push(tableItems);
  piece(
    tableItems,
    rand,
    tableTop[0],
    tableTop[1],
    0.3 * scale,
    tones,
    Object.assign({ clay: 3, glaze: { c: 1, dip: 0.7 }, fire: 4 }, PROFILES.bowl),
  );
  // the brush lies along the table, a little shadow under it
  const brushTip = project(246, 60, tableHeight),
    brushEnd = project(274, 60, tableHeight),
    brushLength = Math.hypot(brushEnd[0] - brushTip[0], brushEnd[1] - brushTip[1]),
    lift = brushLength / 50;
  addLine(
    tableItems,
    wobblySegment(rand, brushTip, brushEnd, 0.2, 2),
    tones.ink,
    brushLength / 25,
    0.15,
  );
  brushTool(
    tableItems,
    rand,
    brushTip[0],
    brushTip[1] - lift,
    Math.atan2(brushEnd[1] - brushTip[1], brushEnd[0] - brushTip[0]),
    brushLength,
    tones,
    PAINTS(tones)[0],
  );
  [0, 1, 2].forEach((i) => {
    const spot = project(256 + i * 7, 42, tableHeight);
    addSolid(
      tableItems,
      wobblyRing(rand, spot[0], spot[1], 3 * scale, 1.5 * scale, 0.2, 8),
      PAINTS(tones)[i],
      0.95,
    );
  });
  return wallCount;
}

export {
  WORKSHOP_WIDTH,
  WORKSHOP_DEPTH,
  WORKSHOP_HEIGHT,
  noren,
  workshopWalls,
  dryingBench,
  noborigama,
  workshopInside,
};
